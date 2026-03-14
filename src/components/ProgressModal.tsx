import { ProcessingState } from '../types';

interface ProgressModalProps {
  open: boolean;
  status: ProcessingState;
  progress: number;
  label: string;
  currentTask: string;
  stageElapsedMs: number;
  wallClockLabel: string;
  browserMemoryMb: number | null;
  estimatedMemoryMb: number;
}

const orderedSteps: Array<keyof ProcessingState> = [
  'upload',
  'preprocess',
  'vectorize',
  'render',
  'transparency',
];

const stateLabel: Record<ProcessingState[keyof ProcessingState], string> = {
  idle: 'Idle',
  ready: 'Ready',
  running: 'Running',
  done: 'Done',
};

export function ProgressModal({
  open,
  status,
  progress,
  label,
  currentTask,
  stageElapsedMs,
  wallClockLabel,
  browserMemoryMb,
  estimatedMemoryMb,
}: ProgressModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-panelSoft/95 p-6 shadow-glow">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent">Processing</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Working on your output</h2>
            <p className="mt-2 text-sm text-mute">{label}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Progress</p>
            <p className="mt-1 text-2xl font-semibold text-white">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accentWarm transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Current Task</p>
            <p className="mt-2 text-sm font-semibold text-white">{currentTask}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Step Elapsed</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {(stageElapsedMs / 1000).toFixed(1)}s
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Current Time</p>
            <p className="mt-2 text-2xl font-semibold text-white">{wallClockLabel}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Browser JS Heap</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {browserMemoryMb !== null ? `${browserMemoryMb.toFixed(1)} MB` : 'Unavailable'}
            </p>
            <p className="mt-1 text-xs text-mute">Chrome 계열 브라우저에서만 직접 측정되는 경우가 많습니다.</p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">Estimated Working Set</p>
            <p className="mt-2 text-2xl font-semibold text-white">{estimatedMemoryMb.toFixed(1)} MB</p>
            <p className="mt-1 text-xs text-mute">마스크, 캔버스, 렌더 버퍼 크기를 기준으로 추정한 값입니다.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {orderedSteps.map((step) => (
            <div key={step} className="rounded-2xl bg-white/[0.05] px-3 py-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{step}</p>
              <p className="mt-1 text-sm font-semibold text-white">{stateLabel[status[step]]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
