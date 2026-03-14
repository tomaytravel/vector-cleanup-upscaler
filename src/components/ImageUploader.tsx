import { useMemo } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
}

export function ImageUploader({ onFileSelect, fileName }: ImageUploaderProps) {
  const onDrop = useMemo(
    () => (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-2xl border border-dashed p-5 transition ${
        isDragActive
          ? 'border-accent bg-accent/10'
          : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]'
      }`}
    >
      <input {...getInputProps()} />
      <div className="space-y-3">
        <p className="text-sm text-ink">
          PNG, JPG, JPEG 파일을 끌어놓거나 버튼으로 선택하세요.
        </p>
        <button
          type="button"
          onClick={open}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        >
          Choose Image
        </button>
        <p className="text-xs text-mute">
          {fileName ? `Selected: ${fileName}` : 'No file selected'}
        </p>
      </div>
    </div>
  );
}
