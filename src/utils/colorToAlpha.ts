import { ColorMatchMode } from '../types';

interface ColorToAlphaOptions {
  target: { r: number; g: number; b: number };
  tolerance: number;
  mode: ColorMatchMode;
}

export function colorToAlpha(canvas: HTMLCanvasElement, options: ColorToAlphaOptions): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to apply transparency cleanup.');
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const channelTolerance = Math.round((options.tolerance / 100) * 255);
  const euclideanTolerance = (options.tolerance / 100) * 441.6729559300637;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    const remove =
      options.mode === 'rgb-strict'
        ? Math.abs(red - options.target.r) <= channelTolerance &&
          Math.abs(green - options.target.g) <= channelTolerance &&
          Math.abs(blue - options.target.b) <= channelTolerance
        : Math.sqrt(
            (red - options.target.r) ** 2 +
              (green - options.target.g) ** 2 +
              (blue - options.target.b) ** 2,
          ) <= euclideanTolerance;

    if (remove) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}
