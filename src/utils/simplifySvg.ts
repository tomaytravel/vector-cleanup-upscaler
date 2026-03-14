import { VectorizeOptions, VectorStatsData } from '../types';

interface SimplifyResult {
  svg: string;
  stats: VectorStatsData;
}

function roundPathData(pathData: string, precision: number): string {
  const factor = 10 ** precision;
  return pathData.replace(/-?\d*\.?\d+/g, (token) => {
    const numeric = Number(token);
    if (Number.isNaN(numeric)) {
      return token;
    }
    return String(Math.round(numeric * factor) / factor);
  });
}

function simplifyPolylineData(points: string, stride: number): string {
  const tokens = points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((pair) => pair.length === 2 && pair.every((value) => !Number.isNaN(value)));

  if (tokens.length <= 4 || stride <= 1) {
    return points;
  }

  const simplified = tokens.filter((_, index) => index === 0 || index === tokens.length - 1 || index % stride === 0);
  return simplified.map(([x, y]) => `${x},${y}`).join(' ');
}

function getPathMetrics(svgElement: SVGSVGElement, element: SVGGraphicsElement) {
  svgElement.appendChild(element);
  const box = element.getBBox();
  svgElement.removeChild(element);
  return box;
}

export function simplifySvg(svgString: string, options: VectorizeOptions): SimplifyResult {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = documentNode.documentElement as SVGSVGElement;
  const viewBox =
    svg.getAttribute('viewBox')?.split(/\s+/).map(Number).filter((value) => !Number.isNaN(value)) ?? [];
  const width = parseFloat(svg.getAttribute('width') || '') || viewBox[2] || svg.viewBox.baseVal.width || 0;
  const height = parseFloat(svg.getAttribute('height') || '') || viewBox[3] || svg.viewBox.baseVal.height || 0;
  const hiddenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  hiddenSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  hiddenSvg.setAttribute('width', String(width || 1));
  hiddenSvg.setAttribute('height', String(height || 1));
  hiddenSvg.style.position = 'absolute';
  hiddenSvg.style.left = '-99999px';
  hiddenSvg.style.top = '-99999px';
  document.body.appendChild(hiddenSvg);

  const elements = Array.from(svg.querySelectorAll('path, polygon, polyline, circle, ellipse, rect')) as SVGGraphicsElement[];
  let removedPaths = 0;
  let keptPaths = 0;

  for (const element of elements) {
    const clone = element.cloneNode(true) as SVGGraphicsElement;
    const box = getPathMetrics(hiddenSvg, clone);
    const area = box.width * box.height;
    const tooSmall = area < options.minPathArea || box.width < options.minDimension || box.height < options.minDimension;

    if (tooSmall) {
      element.remove();
      removedPaths += 1;
      continue;
    }

    keptPaths += 1;
    if (element.tagName === 'path') {
      const pathData = element.getAttribute('d');
      if (pathData) {
        const precision = Math.max(0, 3 - Math.round(options.simplifyTolerance / 2));
        element.setAttribute('d', roundPathData(pathData, precision));
      }
    }

    if (element.tagName === 'polyline' || element.tagName === 'polygon') {
      const points = element.getAttribute('points');
      if (points) {
        const stride = Math.max(1, Math.round(options.simplifyTolerance));
        element.setAttribute('points', simplifyPolylineData(points, stride));
      }
    }
  }

  document.body.removeChild(hiddenSvg);
  const serializer = new XMLSerializer();

  return {
    svg: serializer.serializeToString(svg),
    stats: {
      pathCount: keptPaths,
      width,
      height,
      removedPaths,
    },
  };
}
