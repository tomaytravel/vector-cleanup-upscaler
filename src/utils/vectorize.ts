import ImageTracer from 'imagetracerjs';

export function vectorizeImageData(imageData: ImageData): string {
  const svg = ImageTracer.imagedataToSVG(imageData, {
    ltres: 1,
    qtres: 1,
    pathomit: 0,
    colorsampling: 0,
    numberofcolors: 2,
    mincolorratio: 0,
    colorquantcycles: 1,
    scale: 1,
    roundcoords: 1,
    strokewidth: 0,
    linefilter: true,
    rightangleenhance: true,
    pal: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 0 },
    ],
  });

  return svg;
}
