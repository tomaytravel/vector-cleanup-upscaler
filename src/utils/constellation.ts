import { ConstellationOptions, VectorStatsData } from '../types';
import { createCanvas, disposeCanvas } from './image';

interface Point {
  x: number;
  y: number;
}

interface Component {
  points: Point[];
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centroid: Point;
}

interface CircleFeature {
  cx: number;
  cy: number;
  radius: number;
}

interface LineFeature {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
}

interface SkeletonNode {
  id: string;
  x: number;
  y: number;
}

interface ConstellationResult {
  svg: string;
  stats: VectorStatsData;
  debugOverlayCanvas: HTMLCanvasElement;
}

function buildMask(image: HTMLImageElement, threshold: number, invert: boolean) {
  const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to create constellation preprocessing context.');
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    const alpha = data[index + 3];
    const signal = alpha > 0 ? Math.max(data[index], data[index + 1], data[index + 2]) : 0;
    const isForeground = invert ? signal <= threshold : signal >= threshold;
    mask[i] = isForeground ? 1 : 0;
    const value = isForeground ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  disposeCanvas(canvas);
  return { mask, imageData };
}

function scaleMask(
  image: HTMLImageElement,
  threshold: number,
  invert: boolean,
  scale: number,
) {
  if (scale <= 1) {
    return buildMask(image, threshold, invert);
  }

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to create scaled constellation preprocessing context.');
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    const alpha = data[index + 3];
    const signal = alpha > 0 ? Math.max(data[index], data[index + 1], data[index + 2]) : 0;
    const isForeground = invert ? signal <= threshold : signal >= threshold;
    mask[i] = isForeground ? 1 : 0;
    const value = isForeground ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  disposeCanvas(canvas);
  return { mask, imageData };
}

function getForegroundColor(image: HTMLImageElement, mask: Uint8Array) {
  const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return '#ffffff';
  }

  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) {
      continue;
    }
    const index = i * 4;
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
    count += 1;
  }

  if (!count) {
    return '#ffffff';
  }

  const toHex = (value: number) => Math.round(value / count).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function connectedComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const visited = new Uint8Array(mask.length);
  const components: Component[] = [];
  const offsets = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) {
        continue;
      }

      const queue = [start];
      visited[start] = 1;
      const points: Point[] = [];
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      while (queue.length) {
        const index = queue.pop()!;
        const px = index % width;
        const py = Math.floor(index / width);
        points.push({ x: px, y: py });
        sumX += px;
        sumY += py;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);

        for (const [dx, dy] of offsets) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }
          const next = ny * width + nx;
          if (!mask[next] || visited[next]) {
            continue;
          }
          visited[next] = 1;
          queue.push(next);
        }
      }

      components.push({
        points,
        area: points.length,
        minX,
        minY,
        maxX,
        maxY,
        centroid: {
          x: sumX / points.length,
          y: sumY / points.length,
        },
      });
    }
  }

  return components;
}

function classifyDots(
  components: Component[],
  options: ConstellationOptions,
  width: number,
  height: number,
): { dots: CircleFeature[]; lineMask: Uint8Array } {
  const lineMask = new Uint8Array(width * height);
  const dots: CircleFeature[] = [];

  for (const component of components) {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    const aspect = boxWidth > boxHeight ? boxHeight / boxWidth : boxWidth / boxHeight;
    const fillRatio = component.area / (boxWidth * boxHeight);
    const circularity = aspect * fillRatio;
    const equivalentRadius = Math.sqrt(component.area / Math.PI);
    const isDot =
      component.area >= options.minDotArea &&
      component.area <= options.maxDotArea &&
      circularity >= options.dotCircularity;

    if (isDot) {
      dots.push({
        cx: component.centroid.x,
        cy: component.centroid.y,
        radius: Math.max(0.45, equivalentRadius * options.dotScale),
      });
      continue;
    }

    for (const point of component.points) {
      lineMask[point.y * width + point.x] = 1;
    }
  }

  return { dots, lineMask };
}

function detectLines(
  mask: Uint8Array,
  sourceMask: Uint8Array,
  width: number,
  height: number,
  options: ConstellationOptions,
): LineFeature[] {
  const skeleton = skeletonize(mask, width, height);
  const nodes = findSkeletonNodes(skeleton, width, height);
  return traceSkeletonLines(skeleton, sourceMask, width, height, nodes, options);
}

function distanceSquared(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function mergeCircles(circles: CircleFeature[], options: ConstellationOptions): CircleFeature[] {
  const merged: CircleFeature[] = [];

  for (const circle of circles) {
    let attached = false;

    for (const existing of merged) {
      const joinDistance =
        Math.max(options.endpointSnapDistance * 0.45, Math.max(circle.radius, existing.radius) * 1.8);
      const currentDistance = Math.sqrt(
        distanceSquared(
          { x: circle.cx, y: circle.cy },
          { x: existing.cx, y: existing.cy },
        ),
      );

      if (currentDistance <= joinDistance) {
        existing.cx = (existing.cx + circle.cx) / 2;
        existing.cy = (existing.cy + circle.cy) / 2;
        existing.radius = Math.max(existing.radius, circle.radius);
        attached = true;
        break;
      }
    }

    if (!attached) {
      merged.push({ ...circle });
    }
  }

  return merged;
}

function getIndex(x: number, y: number, width: number) {
  return y * width + x;
}

function getNeighbors(x: number, y: number, width: number, height: number): Point[] {
  const neighbors: Point[] = [];
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      const nextX = x + offsetX;
      const nextY = y + offsetY;
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
        continue;
      }
      neighbors.push({ x: nextX, y: nextY });
    }
  }
  return neighbors;
}

function countForegroundNeighbors(mask: Uint8Array, x: number, y: number, width: number, height: number) {
  return getNeighbors(x, y, width, height).filter((point) => mask[getIndex(point.x, point.y, width)]).length;
}

function countTransitions(mask: Uint8Array, x: number, y: number, width: number) {
  const positions = [
    [x, y - 1],
    [x + 1, y - 1],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
    [x - 1, y + 1],
    [x - 1, y],
    [x - 1, y - 1],
  ];

  let transitions = 0;
  for (let i = 0; i < positions.length; i += 1) {
    const [ax, ay] = positions[i];
    const [bx, by] = positions[(i + 1) % positions.length];
    const a = mask[getIndex(ax, ay, width)];
    const b = mask[getIndex(bx, by, width)];
    if (!a && b) {
      transitions += 1;
    }
  }
  return transitions;
}

function skeletonize(mask: Uint8Array, width: number, height: number): Uint8Array {
  const working = new Uint8Array(mask);
  let changed = true;

  while (changed) {
    changed = false;
    const toRemoveStep1: number[] = [];

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = getIndex(x, y, width);
        if (!working[index]) {
          continue;
        }

        const neighbors = countForegroundNeighbors(working, x, y, width, height);
        const transitions = countTransitions(working, x, y, width);
        const p2 = working[getIndex(x, y - 1, width)];
        const p4 = working[getIndex(x + 1, y, width)];
        const p6 = working[getIndex(x, y + 1, width)];
        const p8 = working[getIndex(x - 1, y, width)];

        if (
          neighbors >= 2 &&
          neighbors <= 6 &&
          transitions === 1 &&
          !(p2 && p4 && p6) &&
          !(p4 && p6 && p8)
        ) {
          toRemoveStep1.push(index);
        }
      }
    }

    if (toRemoveStep1.length) {
      changed = true;
      for (const index of toRemoveStep1) {
        working[index] = 0;
      }
    }

    const toRemoveStep2: number[] = [];

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = getIndex(x, y, width);
        if (!working[index]) {
          continue;
        }

        const neighbors = countForegroundNeighbors(working, x, y, width, height);
        const transitions = countTransitions(working, x, y, width);
        const p2 = working[getIndex(x, y - 1, width)];
        const p4 = working[getIndex(x + 1, y, width)];
        const p6 = working[getIndex(x, y + 1, width)];
        const p8 = working[getIndex(x - 1, y, width)];

        if (
          neighbors >= 2 &&
          neighbors <= 6 &&
          transitions === 1 &&
          !(p2 && p4 && p8) &&
          !(p2 && p6 && p8)
        ) {
          toRemoveStep2.push(index);
        }
      }
    }

    if (toRemoveStep2.length) {
      changed = true;
      for (const index of toRemoveStep2) {
        working[index] = 0;
      }
    }
  }

  return working;
}

function findSkeletonNodes(mask: Uint8Array, width: number, height: number): Map<string, SkeletonNode> {
  const nodes = new Map<string, SkeletonNode>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = getIndex(x, y, width);
      if (!mask[index]) {
        continue;
      }

      const neighborCount = countForegroundNeighbors(mask, x, y, width, height);
      if (neighborCount !== 2) {
        const id = `${x},${y}`;
        nodes.set(id, { id, x, y });
      }
    }
  }

  return nodes;
}

function pointKey(point: Point) {
  return `${point.x},${point.y}`;
}

function segmentKey(a: Point, b: Point) {
  const ak = pointKey(a);
  const bk = pointKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function estimateStrokeWidth(
  sourceMask: Uint8Array,
  center: Point,
  direction: Point,
  width: number,
  height: number,
  options: ConstellationOptions,
) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const nx = -direction.y / length;
  const ny = direction.x / length;
  let positive = 0;
  let negative = 0;

  for (let step = 1; step <= options.maxLineThickness; step += 1) {
    const px = Math.round(center.x + nx * step);
    const py = Math.round(center.y + ny * step);
    if (px < 0 || px >= width || py < 0 || py >= height || !sourceMask[getIndex(px, py, width)]) {
      break;
    }
    positive += 1;
  }

  for (let step = 1; step <= options.maxLineThickness; step += 1) {
    const px = Math.round(center.x - nx * step);
    const py = Math.round(center.y - ny * step);
    if (px < 0 || px >= width || py < 0 || py >= height || !sourceMask[getIndex(px, py, width)]) {
      break;
    }
    negative += 1;
  }

  return Math.max(0.4, (positive + negative + 1) * options.strokeWidthScale);
}

function traceSkeletonLines(
  skeletonMask: Uint8Array,
  sourceMask: Uint8Array,
  width: number,
  height: number,
  nodes: Map<string, SkeletonNode>,
  options: ConstellationOptions,
): LineFeature[] {
  const visited = new Set<string>();
  const lines: LineFeature[] = [];

  const walkSegment = (start: Point, next: Point): Point[] => {
    const path = [start, next];
    let previous = start;
    let current = next;

    while (!nodes.has(pointKey(current))) {
      const nextPoints = getNeighbors(current.x, current.y, width, height).filter((point) => {
        if (!skeletonMask[getIndex(point.x, point.y, width)]) {
          return false;
        }
        return !(point.x === previous.x && point.y === previous.y);
      });

      if (!nextPoints.length) {
        break;
      }

      previous = current;
      current = nextPoints[0];
      path.push(current);
    }

    return path;
  };

  for (const node of nodes.values()) {
    const neighbors = getNeighbors(node.x, node.y, width, height).filter((point) =>
      skeletonMask[getIndex(point.x, point.y, width)],
    );

    for (const neighbor of neighbors) {
      const edgeKey = segmentKey(node, neighbor);
      if (visited.has(edgeKey)) {
        continue;
      }

      const path = walkSegment(node, neighbor);
      for (let i = 0; i < path.length - 1; i += 1) {
        visited.add(segmentKey(path[i], path[i + 1]));
      }

      const start = path[0];
      const end = path[path.length - 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < options.minLineLength) {
        continue;
      }

      const midpoint = path[Math.floor(path.length / 2)];
      const strokeWidth = estimateStrokeWidth(
        sourceMask,
        midpoint,
        { x: dx, y: dy },
        width,
        height,
        options,
      );

      lines.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        strokeWidth: Math.min(options.maxLineThickness, strokeWidth),
      });
    }
  }

  return lines;
}

function rasterizeFeaturesToMask(
  width: number,
  height: number,
  circles: CircleFeature[],
  lines: LineFeature[],
): Uint8Array {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to create validation canvas.');
  }

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';

  for (const line of lines) {
    context.beginPath();
    context.lineCap = 'round';
    context.lineWidth = Math.max(1, line.strokeWidth);
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.stroke();
  }

  for (const circle of circles) {
    context.beginPath();
    context.arc(circle.cx, circle.cy, Math.max(0.5, circle.radius), 0, Math.PI * 2);
    context.fill();
  }

  const { data } = context.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  }

  return mask;
}

function buildDebugOverlay(
  width: number,
  height: number,
  originalMask: Uint8Array,
  vectorMask: Uint8Array,
) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create debug overlay canvas.');
  }

  const imageData = context.createImageData(width, height);
  const { data } = imageData;
  let missingPixelCount = 0;
  let excessPixelCount = 0;

  for (let i = 0; i < originalMask.length; i += 1) {
    const index = i * 4;
    const inOriginal = originalMask[i] === 1;
    const inVector = vectorMask[i] === 1;

    if (inOriginal && inVector) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 180;
      continue;
    }

    if (inOriginal && !inVector) {
      data[index] = 255;
      data[index + 1] = 96;
      data[index + 2] = 96;
      data[index + 3] = 255;
      missingPixelCount += 1;
      continue;
    }

    if (!inOriginal && inVector) {
      data[index] = 70;
      data[index + 1] = 220;
      data[index + 2] = 255;
      data[index + 3] = 255;
      excessPixelCount += 1;
    }
  }

  context.putImageData(imageData, 0, 0);
  return {
    canvas,
    missingPixelCount,
    excessPixelCount,
  };
}

function buildDiffMasks(originalMask: Uint8Array, vectorMask: Uint8Array) {
  const missingMask = new Uint8Array(originalMask.length);
  const excessMask = new Uint8Array(originalMask.length);
  let missingPixelCount = 0;
  let excessPixelCount = 0;

  for (let i = 0; i < originalMask.length; i += 1) {
    if (originalMask[i] && !vectorMask[i]) {
      missingMask[i] = 1;
      missingPixelCount += 1;
    }
    if (!originalMask[i] && vectorMask[i]) {
      excessMask[i] = 1;
      excessPixelCount += 1;
    }
  }

  return {
    missingMask,
    excessMask,
    missingPixelCount,
    excessPixelCount,
  };
}

function rasterizeSingleCircle(width: number, height: number, circle: CircleFeature): Uint8Array {
  return rasterizeFeaturesToMask(width, height, [circle], []);
}

function rasterizeSingleLine(width: number, height: number, line: LineFeature): Uint8Array {
  return rasterizeFeaturesToMask(width, height, [], [line]);
}

function scoreMaskAgainstSource(featureMask: Uint8Array, sourceMask: Uint8Array) {
  let overlap = 0;
  let outside = 0;
  for (let i = 0; i < featureMask.length; i += 1) {
    if (!featureMask[i]) {
      continue;
    }
    if (sourceMask[i]) {
      overlap += 1;
    } else {
      outside += 1;
    }
  }
  return { overlap, outside };
}

function sampleLineCoverage(
  line: LineFeature,
  sourceMask: Uint8Array,
  width: number,
  height: number,
) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(length));
  let onSource = 0;

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(line.x1 + dx * t);
    const y = Math.round(line.y1 + dy * t);
    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue;
    }
    if (sourceMask[getIndex(x, y, width)]) {
      onSource += 1;
    }
  }

  return onSource / (steps + 1);
}

function endpointTouchesCircle(line: LineFeature, circles: CircleFeature[]) {
  const start = { x: line.x1, y: line.y1 };
  const end = { x: line.x2, y: line.y2 };
  let startValid = false;
  let endValid = false;

  for (const circle of circles) {
    const center = { x: circle.cx, y: circle.cy };
    const startDistance = Math.sqrt(distanceSquared(start, center));
    const endDistance = Math.sqrt(distanceSquared(end, center));
    const touchDistance = Math.max(circle.radius * 1.6, 1.5);

    if (startDistance <= touchDistance) {
      startValid = true;
    }
    if (endDistance <= touchDistance) {
      endValid = true;
    }
  }

  return { startValid, endValid };
}

function pruneExcessFeatures(
  sourceMask: Uint8Array,
  width: number,
  height: number,
  circles: CircleFeature[],
  lines: LineFeature[],
) {
  const keptCircles = circles.filter((circle) => {
    const score = scoreMaskAgainstSource(rasterizeSingleCircle(width, height, circle), sourceMask);
    return score.overlap >= score.outside;
  });

  const keptLines = lines.filter((line) => {
    const score = scoreMaskAgainstSource(rasterizeSingleLine(width, height, line), sourceMask);
    return score.overlap >= score.outside;
  });

  return { circles: keptCircles, lines: keptLines };
}

function pruneStructurallyInvalidLines(
  sourceMask: Uint8Array,
  width: number,
  height: number,
  circles: CircleFeature[],
  lines: LineFeature[],
) {
  const keptLines = lines.filter((line) => {
    const coverage = sampleLineCoverage(line, sourceMask, width, height);
    const touch = endpointTouchesCircle(line, circles);
    const validEndpoints = Number(touch.startValid) + Number(touch.endValid);
    return coverage >= 0.55 && validEndpoints >= 1;
  });

  return { circles, lines: keptLines };
}

function recoverMissingFeatures(
  missingMask: Uint8Array,
  sourceMask: Uint8Array,
  width: number,
  height: number,
  circles: CircleFeature[],
  lines: LineFeature[],
  options: ConstellationOptions,
): { circles: CircleFeature[]; lines: LineFeature[]; recoveredCount: number } {
  const residualComponents = connectedComponents(missingMask, width, height);
  if (!residualComponents.length) {
    return { circles, lines, recoveredCount: 0 };
  }

  const { dots: recoveredDots, lineMask: recoveredLineMask } = classifyDots(
    residualComponents,
    options,
    width,
    height,
  );
  const recoveredLines = detectLines(recoveredLineMask, sourceMask, width, height, options);
  const microDots = residualComponents
    .filter((component) => component.area >= options.microDotArea && component.area < options.minDotArea)
    .map((component) => ({
      cx: component.centroid.x,
      cy: component.centroid.y,
      radius: Math.max(0.4, Math.sqrt(component.area / Math.PI) * Math.max(0.55, options.dotScale)),
    }));

  const microLines = residualComponents
    .filter((component) => {
      const boxWidth = component.maxX - component.minX + 1;
      const boxHeight = component.maxY - component.minY + 1;
      const length = Math.max(boxWidth, boxHeight);
      const thickness = Math.min(boxWidth, boxHeight);
      return component.area >= 2 && length >= options.microLineLength && thickness <= 2;
    })
    .map((component) => ({
      x1: component.minX,
      y1: component.minY,
      x2: component.maxX,
      y2: component.maxY,
      strokeWidth: 0.6,
    }));

  if (!recoveredDots.length && !recoveredLines.length && !microDots.length && !microLines.length) {
    return { circles, lines, recoveredCount: 0 };
  }

  const graph = snapLinesToCircles(
    [...lines, ...recoveredLines, ...microLines],
    [...circles, ...recoveredDots, ...microDots],
    options,
  );

  return {
    circles: graph.circles,
    lines: graph.lines,
    recoveredCount: recoveredDots.length + recoveredLines.length + microDots.length + microLines.length,
  };
}

function downscaleFeatures(
  circles: CircleFeature[],
  lines: LineFeature[],
  scale: number,
): { circles: CircleFeature[]; lines: LineFeature[] } {
  if (scale <= 1) {
    return { circles, lines };
  }

  return {
    circles: circles.map((circle) => ({
      cx: circle.cx / scale,
      cy: circle.cy / scale,
      radius: circle.radius / scale,
    })),
    lines: lines.map((line) => ({
      x1: line.x1 / scale,
      y1: line.y1 / scale,
      x2: line.x2 / scale,
      y2: line.y2 / scale,
      strokeWidth: line.strokeWidth / scale,
    })),
  };
}

function snapLinesToCircles(
  lines: LineFeature[],
  circles: CircleFeature[],
  options: ConstellationOptions,
): { lines: LineFeature[]; circles: CircleFeature[] } {
  const workingCircles = [...circles.map((circle) => ({ ...circle }))];

  const snappedLines = lines.map((line) => {
    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    let bestStart = start;
    let bestEnd = end;
    let startDistance = Number.POSITIVE_INFINITY;
    let endDistance = Number.POSITIVE_INFINITY;

    for (const circle of workingCircles) {
      const center = { x: circle.cx, y: circle.cy };
      const currentStartDistance = distanceSquared(start, center);
      const currentEndDistance = distanceSquared(end, center);
      const snapDistance = Math.max(
        options.endpointSnapDistance,
        circle.radius * 3 + line.strokeWidth * 2,
      );
      const snapDistanceSquared = snapDistance * snapDistance;

      if (currentStartDistance < startDistance && currentStartDistance <= snapDistanceSquared) {
        startDistance = currentStartDistance;
        bestStart = center;
      }

      if (currentEndDistance < endDistance && currentEndDistance <= snapDistanceSquared) {
        endDistance = currentEndDistance;
        bestEnd = center;
      }
    }

    if (startDistance === Number.POSITIVE_INFINITY) {
      workingCircles.push({
        cx: start.x,
        cy: start.y,
        radius: Math.max(0.45, line.strokeWidth * 0.9),
      });
    }

    if (endDistance === Number.POSITIVE_INFINITY) {
      workingCircles.push({
        cx: end.x,
        cy: end.y,
        radius: Math.max(0.45, line.strokeWidth * 0.9),
      });
    }

    return {
      ...line,
      x1: bestStart.x,
      y1: bestStart.y,
      x2: bestEnd.x,
      y2: bestEnd.y,
    };
  });

  const mergedCircles = mergeCircles(workingCircles, options);
  const resnappedLines = snappedLines.map((line) => {
    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    let bestStart = start;
    let bestEnd = end;
    let startDistance = Number.POSITIVE_INFINITY;
    let endDistance = Number.POSITIVE_INFINITY;

    for (const circle of mergedCircles) {
      const center = { x: circle.cx, y: circle.cy };
      const currentStartDistance = distanceSquared(start, center);
      const currentEndDistance = distanceSquared(end, center);

      if (currentStartDistance < startDistance) {
        startDistance = currentStartDistance;
        bestStart = center;
      }

      if (currentEndDistance < endDistance) {
        endDistance = currentEndDistance;
        bestEnd = center;
      }
    }

    return {
      ...line,
      x1: bestStart.x,
      y1: bestStart.y,
      x2: bestEnd.x,
      y2: bestEnd.y,
    };
  });

  return {
    lines: resnappedLines,
    circles: mergedCircles,
  };
}

function renderConstellationSvg(
  width: number,
  height: number,
  circles: CircleFeature[],
  lines: LineFeature[],
  stroke: string,
) {
  const lineMarkup = lines
    .map(
      (line) =>
        `<line x1="${line.x1.toFixed(2)}" y1="${line.y1.toFixed(2)}" x2="${line.x2.toFixed(2)}" y2="${line.y2.toFixed(2)}" stroke="${stroke}" stroke-width="${line.strokeWidth.toFixed(2)}" stroke-linecap="round" />`,
    )
    .join('');

  const circleMarkup = circles
    .map(
      (circle) =>
        `<circle cx="${circle.cx.toFixed(2)}" cy="${circle.cy.toFixed(2)}" r="${circle.radius.toFixed(2)}" fill="${stroke}" />`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${lineMarkup}${circleMarkup}</svg>`;
}

export function vectorizeConstellation(
  image: HTMLImageElement,
  options: ConstellationOptions,
): ConstellationResult {
  const detectionScale = Math.max(1, options.detectionScale);
  const originalMaskData =
    detectionScale > 1 ? buildMask(image, options.threshold, options.invert) : null;
  const { mask, imageData } = scaleMask(
    image,
    options.threshold,
    options.invert,
    detectionScale,
  );
  const components = connectedComponents(mask, imageData.width, imageData.height);
  const { dots, lineMask } = classifyDots(components, options, imageData.width, imageData.height);
  const rawLines = detectLines(lineMask, mask, imageData.width, imageData.height, options);
  const graph = snapLinesToCircles(rawLines, dots, options);
  let workingCircles = graph.circles;
  let workingLines = graph.lines;
  let recoveredCount = 0;

  for (let pass = 0; pass < 2; pass += 1) {
    const currentMask = rasterizeFeaturesToMask(
      imageData.width,
      imageData.height,
      workingCircles,
      workingLines,
    );
    const diff = buildDiffMasks(mask, currentMask);
    if (!diff.missingPixelCount && !diff.excessPixelCount) {
      break;
    }

    const recovered = recoverMissingFeatures(
      diff.missingMask,
      mask,
      imageData.width,
      imageData.height,
      workingCircles,
      workingLines,
      options,
    );

    recoveredCount += recovered.recoveredCount;
    const pruned = pruneExcessFeatures(
      mask,
      imageData.width,
      imageData.height,
      recovered.circles,
      recovered.lines,
    );
    const structurallyPruned = pruneStructurallyInvalidLines(
      mask,
      imageData.width,
      imageData.height,
      pruned.circles,
      pruned.lines,
    );
    const resnapped = snapLinesToCircles(
      structurallyPruned.lines,
      structurallyPruned.circles,
      options,
    );

    workingCircles = resnapped.circles;
    workingLines = resnapped.lines;
  }

  const normalized = downscaleFeatures(workingCircles, workingLines, detectionScale);
  const lines = normalized.lines;
  const circles = normalized.circles;
  const finalOriginalMask = originalMaskData?.mask ?? mask;
  const vectorMaskAtOutputScale = rasterizeFeaturesToMask(
    image.naturalWidth,
    image.naturalHeight,
    circles,
    lines,
  );
  const debugOverlay = buildDebugOverlay(
    image.naturalWidth,
    image.naturalHeight,
    finalOriginalMask,
    vectorMaskAtOutputScale,
  );
  const stroke = getForegroundColor(image, finalOriginalMask);
  const svg = renderConstellationSvg(image.naturalWidth, image.naturalHeight, circles, lines, stroke);

  return {
    svg,
    stats: {
      pathCount: circles.length + lines.length,
      width: image.naturalWidth,
      height: image.naturalHeight,
      removedPaths: Math.max(0, components.length - circles.length - lines.length) + recoveredCount,
      circleCount: circles.length,
      lineCount: lines.length,
      missingPixelCount: debugOverlay.missingPixelCount,
      excessPixelCount: debugOverlay.excessPixelCount,
    },
    debugOverlayCanvas: debugOverlay.canvas,
  };
}
