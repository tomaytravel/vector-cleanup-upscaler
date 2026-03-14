/// <reference types="vite/client" />

declare module 'imagetracerjs' {
  const ImageTracer: {
    imagedataToSVG: (imageData: ImageData, options?: Record<string, unknown>) => string;
  };

  export default ImageTracer;
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
