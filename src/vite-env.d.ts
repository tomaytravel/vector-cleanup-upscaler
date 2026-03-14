/// <reference types="vite/client" />

declare module 'imagetracerjs' {
  const ImageTracer: {
    imagedataToSVG: (imageData: ImageData, options?: Record<string, unknown>) => string;
  };

  export default ImageTracer;
}

declare module 'pica' {
  interface ResizeOptions {
    alpha?: boolean;
    unsharpAmount?: number;
    unsharpRadius?: number;
    unsharpThreshold?: number;
  }

  interface PicaInstance {
    resize: (
      from: HTMLCanvasElement,
      to: HTMLCanvasElement,
      options?: ResizeOptions,
    ) => Promise<HTMLCanvasElement>;
  }

  export default function pica(): PicaInstance;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropper {
  open: () => Promise<EyeDropperResult>;
}

interface EyeDropperConstructor {
  new (): EyeDropper;
}

interface Window {
  EyeDropper?: EyeDropperConstructor;
}
