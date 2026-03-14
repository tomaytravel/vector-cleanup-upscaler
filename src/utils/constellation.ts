import { ConstellationOptions, VectorStatsData } from '../types';
import { createCanvas } from './image';

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

interface ConstellationResult {
  svg: string;
  stats: VectorStatsData;
  maskCanvas: HTMLCanvasElement;
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
  return { canvas, mask, imageData };
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
  width: number,
  height: number,
  options: ConstellationOptions,
): LineFeature[] {
  const components = connectedComponents(mask, width, height);
  const lines: LineFeature[] = [];

  for (const component of components) {
    if (component.area < 2) {
      continue;
    }

    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    const longAxis = Math.max(boxWidth, boxHeight);
    const shortAxis = Math.max(1, Math.min(boxWidth, boxHeight));
    const elongation = longAxis / shortAxis;

    const centroid = component.centroid;
    let covXX = 0;
    let covXY = 0;
    let covYY = 0;

    for (const point of component.points) {
      const dx = point.x - centroid.x;
      const dy = point.y - centroid.y;
      covXX += dx * dx;
      covXY += dx * dy;
      covYY += dy * dy;
    }

    const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    const dirX = Math.cos(theta);
    const dirY = Math.sin(theta);
    const normalX = -dirY;
    const normalY = dirX;

    let minProjection = Number.POSITIVE_INFINITY;
    let maxProjection = Number.NEGATIVE_INFINITY;
    let normalVariance = 0;

    for (const point of component.points) {
      const dx = point.x - centroid.x;
      const dy = point.y - centroid.y;
      const projection = dx * dirX + dy * dirY;
      const distance = dx * normalX + dy * normalY;
      minProjection = Math.min(minProjection, projection);
      maxProjection = Math.max(maxProjection, projection);
      normalVariance += distance * distance;
    }

    const length = maxProjection - minProjection;
    if (length < options.minLineLength || elongation < 2.2) {
      continue;
    }

    const varianceThickness = 2 * Math.sqrt(normalVariance / component.points.length);
    const bboxThickness = shortAxis * 0.9;
    const thickness = Math.max(
      0.45,
      Math.min(options.maxLineThickness, Math.min(varianceThickness, bboxThickness)),
    );

    lines.push({
      x1: centroid.x + minProjection * dirX,
      y1: centroid.y + minProjection * dirY,
      x2: centroid.x + maxProjection * dirX,
      y2: centroid.y + maxProjection * dirY,
      strokeWidth: Math.max(0.4, thickness * options.strokeWidthScale),
    });
  }

  return lines;
}

function distanceSquared(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function snapLinesToCircles(
  lines: LineFeature[],
  circles: CircleFeature[],
  options: ConstellationOptions,
): LineFeature[] {
  if (!circles.length) {
    return lines;
  }

  return lines.map((line) => {
    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    let bestStart = start;
    let bestEnd = end;
    let startDistance = Number.POSITIVE_INFINITY;
    let endDistance = Number.POSITIVE_INFINITY;

    for (const circle of circles) {
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

    return {
      ...line,
      x1: bestStart.x,
      y1: bestStart.y,
      x2: bestEnd.x,
      y2: bestEnd.y,
    };
  });
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
  const { canvas, mask, imageData } = buildMask(image, options.threshold, options.invert);
  const components = connectedComponents(mask, imageData.width, imageData.height);
  const { dots, lineMask } = classifyDots(components, options, imageData.width, imageData.height);
  const rawLines = detectLines(lineMask, imageData.width, imageData.height, options);
  const lines = snapLinesToCircles(rawLines, dots, options);
  const stroke = getForegroundColor(image, mask);
  const svg = renderConstellationSvg(imageData.width, imageData.height, dots, lines, stroke);

  return {
    svg,
    stats: {
      pathCount: dots.length + lines.length,
      width: imageData.width,
      height: imageData.height,
      removedPaths: Math.max(0, components.length - dots.length - lines.length),
      circleCount: dots.length,
      lineCount: lines.length,
    },
    maskCanvas: canvas,
  };
}
