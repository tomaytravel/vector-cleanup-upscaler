import { MouseEvent, useMemo, useRef } from 'react';

interface PreviewPaneProps {
  title: string;
  src?: string | null;
  isSvg?: boolean;
  zoom: number;
  onZoomChange: (value: number) => void;
  checkerboard?: boolean;
  onSampleColor?: (x: number, y: number) => void;
  eyedropperActive?: boolean;
}

export function PreviewPane({
  title,
  src,
  isSvg = false,
  zoom,
  onZoomChange,
  checkerboard = false,
  onSampleColor,
  eyedropperActive = false,
}: PreviewPaneProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewSrc = useMemo(() => {
    if (!src) {
      return undefined;
    }
    return isSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}` : src;
  }, [isSvg, src]);

  const handleClick = (event: MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !onSampleColor || !eyedropperActive) {
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    const x = Math.max(0, Math.min(imageRef.current.naturalWidth - 1, Math.floor((event.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(imageRef.current.naturalHeight - 1, Math.floor((event.clientY - rect.top) * scaleY)));
    onSampleColor(x, y);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-accentWarm">{title}</h3>
        <label className="flex items-center gap-3 text-xs text-mute">
          Zoom
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
          />
          <span className="w-10 text-right text-ink">{zoom.toFixed(1)}x</span>
        </label>
      </div>

      <div
        className={`scrollbar-thin overflow-auto rounded-2xl border border-white/10 p-3 ${
          checkerboard ? 'checkerboard' : 'bg-slate-950/40'
        }`}
      >
        {previewSrc ? (
          <img
            ref={imageRef}
            src={previewSrc}
            alt={title}
            onClick={handleClick}
            className={`mx-auto block max-w-none rounded-xl ${
              eyedropperActive ? 'cursor-crosshair ring-2 ring-accentWarm/60' : ''
            }`}
            style={{ width: `calc(${zoom * 100}% )` }}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-mute">
            Preview will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
