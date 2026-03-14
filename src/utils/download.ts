import { saveAs } from 'file-saver';

export async function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to convert canvas to PNG blob.');
  }
  saveAs(blob, fileName);
}
