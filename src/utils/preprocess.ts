import { PreprocessOptions } from '../types';
import { createCanvas } from './image';

function applyMedianNoiseCleanup(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const values: number[] = [];
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const index = ((y + offsetY) * width + (x + offsetX)) * 4;
          values.push(data[index]);
        }
      }
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      const targetIndex = (y * width + x) * 4;
      result[targetIndex] = median;
      result[targetIndex + 1] = median;
      result[targetIndex + 2] = median;
    }
  }

  return new ImageData(result, width, height);
}

export function preprocessImage(
  image: HTMLImageElement,
  options: PreprocessOptions,
): { canvas: HTMLCanvasElement; imageData: ImageData } {
  const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to create preprocessing context.');
  }

  context.drawImage(image, 0, 0);
  let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    const gray = options.grayscale
      ? Math.round(red * 0.299 + green * 0.587 + blue * 0.114)
      : Math.max(red, green, blue);

    let value = gray >= options.threshold ? 255 : 0;
    if (options.invert) {
      value = 255 - value;
    }

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = alpha;
  }

  if (options.noiseReduction) {
    imageData = applyMedianNoiseCleanup(imageData);
  }

  context.putImageData(imageData, 0, 0);
  return { canvas, imageData };
}
