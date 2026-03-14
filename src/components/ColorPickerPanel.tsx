import { HexColorPicker } from 'react-colorful';
import { TransparencyOptions } from '../types';

interface ColorPickerPanelProps {
  options: TransparencyOptions;
  onChange: (patch: Partial<TransparencyOptions>) => void;
  onEyedropper: () => void;
  eyedropperActive: boolean;
}

export function ColorPickerPanel({
  options,
  onChange,
  onEyedropper,
  eyedropperActive,
}: ColorPickerPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Enable transparency cleanup</p>
          <p className="text-xs text-mute">선택한 색상과 유사한 픽셀을 alpha 0으로 처리합니다.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={options.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-slate-950"
          />
        </label>
      </div>

      <div className="rounded-2xl bg-white/[0.04] p-3">
        <HexColorPicker color={options.targetHex} onChange={(value) => onChange({ targetHex: value })} />
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <input
          value={options.targetHex}
          onChange={(event) => onChange({ targetHex: event.target.value })}
          className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={onEyedropper}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            eyedropperActive
              ? 'bg-accentWarm text-slate-950'
              : 'bg-white/10 text-ink hover:bg-white/20'
          }`}
        >
          {eyedropperActive ? 'Click Preview' : 'Eyedropper'}
        </button>
      </div>

      <label className="block text-sm text-mute">
        Tolerance: <span className="font-semibold text-ink">{options.tolerance}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={options.tolerance}
          onChange={(event) => onChange({ tolerance: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="mb-2 block text-mute">Distance Mode</span>
          <select
            value={options.mode}
            onChange={(event) => onChange({ mode: event.target.value as TransparencyOptions['mode'] })}
            className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-ink"
          >
            <option value="rgb-strict">RGB strict</option>
            <option value="euclidean">Euclidean</option>
          </select>
        </label>
      </div>
    </div>
  );
}
