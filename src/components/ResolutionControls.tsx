import { ScaleOptions } from '../types';

interface ResolutionControlsProps {
  options: ScaleOptions;
  onChange: (patch: Partial<ScaleOptions>) => void;
  sourceWidth: number;
  sourceHeight: number;
}

export function ResolutionControls({
  options,
  onChange,
  sourceWidth,
  sourceHeight,
}: ResolutionControlsProps) {
  const applyPreset = (preset: ScaleOptions['preset']) => {
    if (!sourceWidth || !sourceHeight) {
      onChange({ preset });
      return;
    }

    if (preset === 'custom') {
      onChange({ preset });
      return;
    }

    const multiplier = preset === '2x' ? 2 : 4;
    onChange({
      preset,
      width: sourceWidth * multiplier,
      height: sourceHeight * multiplier,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(['2x', '4x', 'custom'] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyPreset(preset)}
            className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
              options.preset === preset
                ? 'bg-accent text-slate-950'
                : 'bg-white/8 text-ink hover:bg-white/15'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-mute">
          Width
          <input
            type="number"
            min={1}
            value={options.width}
            onChange={(event) => onChange({ preset: 'custom', width: Number(event.target.value) })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm text-mute">
          Height
          <input
            type="number"
            min={1}
            value={options.height}
            onChange={(event) => onChange({ preset: 'custom', height: Number(event.target.value) })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-ink"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-mute">
          Background
          <select
            value={options.background}
            onChange={(event) => onChange({ background: event.target.value as ScaleOptions['background'] })}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-ink"
          >
            <option value="transparent">Transparent</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>

        <label className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-mute">
          Post Process
          <select
            value={options.postProcess}
            onChange={(event) =>
              onChange({ postProcess: event.target.value as ScaleOptions['postProcess'] })
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-ink"
          >
            <option value="none">None</option>
            <option value="light-sharpen">Light sharpen</option>
            <option value="crisp-edge">Crisp edge</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={options.smoothing}
          onChange={(event) => onChange({ smoothing: event.target.checked })}
          className="h-4 w-4 rounded border-white/20 bg-slate-950"
        />
        Image smoothing enabled
      </label>
    </div>
  );
}
