import pica from 'pica';
import { BackgroundMode, PostProcessMode } from '../types';
import { createCanvas, loadImage } from './image';

interface RenderOptions {
  width: number;
  height: number;
  smoothing: boolean;
  background: BackgroundMode;
  postProcess: PostProcessMode;
}

function fillBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundMode,
) {
  if (background === 'transparent') {
    context.clearRect(0, 0, width, height);
    return;
  }

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
}

function sharpenImageData(imageData: ImageData, aggressive: boolean): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  const kernel = aggressive ? [0, -1, 0, -1, 5, -1, 0, -1, 0] : [-0.25, -0.25, -0.25, -0.25, 3, -0.25, -0.25, -0.25, -0.25];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let sum = 0;
        let kernelIndex = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const sourceIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
            sum += data[sourceIndex] * kernel[kernelIndex];
            kernelIndex += 1;
          }
        }
        const targetIndex = (y * width + x) * 4 + channel;
        output[targetIndex] = Math.max(0, Math.min(255, Math.round(sum)));
      }
    }
  }

  return new ImageData(output, width, height);
}

function crispEdges(imageData: ImageData): ImageData {
  const output = new Uint8ClampedArray(imageData.data);
  for (let index = 0; index < output.length; index += 4) {
    output[index] = output[index] > 127 ? 255 : 0;
    output[index + 1] = output[index + 1] > 127 ? 255 : 0;
    output[index + 2] = output[index + 2] > 127 ? 255 : 0;
  }
  return new ImageData(output, imageData.width, imageData.height);
}

export async function renderSvgToCanvas(svg: string, options: RenderOptions): Promise<HTMLCanvasElement> {
  const sourceCanvas = createCanvas(Math.max(1, Math.round(options.width / 2)), Math.max(1, Math.round(options.height / 2)));
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) {
    throw new Error('Unable to create source render context.');
  }

  fillBackground(sourceContext, sourceCanvas.width, sourceCanvas.height, options.background);
  sourceContext.imageSmoothingEnabled = options.smoothing;

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  const finalCanvas = createCanvas(options.width, options.height);
  const finalContext = finalCanvas.getContext('2d');
  if (!finalContext) {
    throw new Error('Unable to create final render context.');
  }

  fillBackground(finalContext, finalCanvas.width, finalCanvas.height, options.background);
  finalContext.imageSmoothingEnabled = options.smoothing;

  const scaler = pica();
  await scaler.resize(sourceCanvas, finalCanvas, {
    alpha: true,
    unsharpAmount: options.postProcess === 'light-sharpen' ? 80 : 0,
    unsharpRadius: options.postProcess === 'light-sharpen' ? 0.8 : 0,
    unsharpThreshold: options.postProcess === 'light-sharpen' ? 1 : 0,
  });

  if (options.postProcess !== 'none') {
    let imageData = finalContext.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
    if (options.postProcess === 'light-sharpen') {
      imageData = sharpenImageData(imageData, false);
    }
    if (options.postProcess === 'crisp-edge') {
      imageData = sharpenImageData(imageData, true);
      imageData = crispEdges(imageData);
    }
    finalContext.putImageData(imageData, 0, 0);
  }

  return finalCanvas;
}
