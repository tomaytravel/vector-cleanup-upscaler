export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function buildDownloadName(originalName: string): string {
  const safeName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '_');
  return `${safeName || 'image'}_vector_upscaled_transparent.png`;
}
