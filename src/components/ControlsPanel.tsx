import { ImageUploader } from './ImageUploader';
import { SectionCard } from './SectionCard';
import { ColorPickerPanel } from './ColorPickerPanel';
import { ResolutionControls } from './ResolutionControls';
import { VectorStats } from './VectorStats';
import {
  AppMode,
  ConstellationOptions,
  PreprocessOptions,
  ProcessingState,
  ScaleOptions,
  TransparencyOptions,
  VectorStatsData,
  VectorizeOptions,
} from '../types';

interface ControlsPanelProps {
  appMode: AppMode;
  fileName?: string;
  preprocess: PreprocessOptions;
  vectorize: VectorizeOptions;
  constellation: ConstellationOptions;
  scale: ScaleOptions;
  transparency: TransparencyOptions;
  status: ProcessingState;
  stats: VectorStatsData | null;
  sourceWidth: number;
  sourceHeight: number;
  eyedropperActive: boolean;
  onFileSelect: (file: File) => void;
  onPreprocessChange: (patch: Partial<PreprocessOptions>) => void;
  onVectorizeChange: (patch: Partial<VectorizeOptions>) => void;
  onConstellationChange: (patch: Partial<ConstellationOptions>) => void;
  onScaleChange: (patch: Partial<ScaleOptions>) => void;
  onTransparencyChange: (patch: Partial<TransparencyOptions>) => void;
  onEyedropper: () => void;
}

const statusTone: Record<ProcessingState[keyof ProcessingState], string> = {
  idle: 'bg-white/10 text-mute',
  ready: 'bg-accentWarm/20 text-accentWarm',
  running: 'bg-accent/20 text-accent',
  done: 'bg-emerald-400/20 text-emerald-300',
};

export function ControlsPanel(props: ControlsPanelProps) {
  const {
    fileName,
    appMode,
    preprocess,
    vectorize,
    constellation,
    scale,
    transparency,
    status,
    stats,
    sourceWidth,
    sourceHeight,
    eyedropperActive,
    onFileSelect,
    onPreprocessChange,
    onVectorizeChange,
    onConstellationChange,
    onScaleChange,
    onTransparencyChange,
    onEyedropper,
  } = props;

  return (
    <div className="space-y-4">
      <SectionCard title="Upload" description="원본 이미지를 업로드합니다.">
        <ImageUploader onFileSelect={onFileSelect} fileName={fileName} />
      </SectionCard>

      <SectionCard
        title={appMode === 'cleanup' ? 'Preprocess' : 'Constellation Detect'}
        description={
          appMode === 'cleanup'
            ? '마스크 추출과 노이즈 정리를 설정합니다.'
            : '점은 원으로, 선은 선분으로 분리하기 위한 검출 기준입니다.'
        }
      >
        {appMode === 'cleanup' ? (
          <>
        <label className="block text-sm text-mute">
          Threshold: <span className="font-semibold text-ink">{preprocess.threshold}</span>
          <input
            type="range"
            min={0}
            max={255}
            value={preprocess.threshold}
            onChange={(event) => onPreprocessChange({ threshold: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm text-mute">
          Simplify: <span className="font-semibold text-ink">{preprocess.simplifyAmount.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={preprocess.simplifyAmount}
            onChange={(event) => onPreprocessChange({ simplifyAmount: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm text-ink">
          <label className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3">
            <input
              type="checkbox"
              checked={preprocess.grayscale}
              onChange={(event) => onPreprocessChange({ grayscale: event.target.checked })}
            />
            Grayscale
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3">
            <input
              type="checkbox"
              checked={preprocess.invert}
              onChange={(event) => onPreprocessChange({ invert: event.target.checked })}
            />
            Invert
          </label>
          <label className="col-span-2 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3">
            <input
              type="checkbox"
              checked={preprocess.noiseReduction}
              onChange={(event) => onPreprocessChange({ noiseReduction: event.target.checked })}
            />
            Noise reduction
          </label>
        </div>
          </>
        ) : (
          <>
            <label className="block text-sm text-mute">
              Threshold: <span className="font-semibold text-ink">{constellation.threshold}</span>
              <input
                type="range"
                min={0}
                max={255}
                value={constellation.threshold}
                onChange={(event) =>
                  onConstellationChange({ threshold: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-mute">
                Min dot area
                <input
                  type="number"
                  min={1}
                  value={constellation.minDotArea}
                  onChange={(event) =>
                    onConstellationChange({ minDotArea: Number(event.target.value) })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-ink"
                />
              </label>
              <label className="text-sm text-mute">
                Max dot area
                <input
                  type="number"
                  min={1}
                  value={constellation.maxDotArea}
                  onChange={(event) =>
                    onConstellationChange({ maxDotArea: Number(event.target.value) })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-ink"
                />
              </label>
            </div>
            <label className="block text-sm text-mute">
              Dot circularity: <span className="font-semibold text-ink">{constellation.dotCircularity.toFixed(2)}</span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={constellation.dotCircularity}
                onChange={(event) =>
                  onConstellationChange({ dotCircularity: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
            <label className="block text-sm text-mute">
              Dot scale: <span className="font-semibold text-ink">{constellation.dotScale.toFixed(2)}</span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={constellation.dotScale}
                onChange={(event) =>
                  onConstellationChange({ dotScale: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={constellation.invert}
                onChange={(event) => onConstellationChange({ invert: event.target.checked })}
              />
              Invert foreground detection
            </label>
          </>
        )}
      </SectionCard>

      <SectionCard
        title={appMode === 'cleanup' ? 'Vectorize' : 'Vector Rebuild'}
        description={
          appMode === 'cleanup'
            ? 'SVG path 정리 기준을 조절합니다.'
            : '검출된 별 점과 선을 정밀한 벡터 원과 선분으로 재구성합니다.'
        }
      >
        {appMode === 'cleanup' ? (
          <>
        <label className="block text-sm text-mute">
          Minimum path area: <span className="font-semibold text-ink">{vectorize.minPathArea}</span>
          <input
            type="range"
            min={1}
            max={400}
            value={vectorize.minPathArea}
            onChange={(event) => onVectorizeChange({ minPathArea: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm text-mute">
          Minimum path dimension: <span className="font-semibold text-ink">{vectorize.minDimension}</span>
          <input
            type="range"
            min={1}
            max={40}
            value={vectorize.minDimension}
            onChange={(event) => onVectorizeChange({ minDimension: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm text-mute">
          Simplify tolerance: <span className="font-semibold text-ink">{vectorize.simplifyTolerance.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={8}
            step={0.1}
            value={vectorize.simplifyTolerance}
            onChange={(event) => onVectorizeChange({ simplifyTolerance: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>
          </>
        ) : (
          <>
            <label className="block text-sm text-mute">
              Min line length: <span className="font-semibold text-ink">{constellation.minLineLength}</span>
              <input
                type="range"
                min={1}
                max={80}
                value={constellation.minLineLength}
                onChange={(event) =>
                  onConstellationChange({ minLineLength: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
            <label className="block text-sm text-mute">
              Max line thickness: <span className="font-semibold text-ink">{constellation.maxLineThickness.toFixed(1)}</span>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={constellation.maxLineThickness}
                onChange={(event) =>
                  onConstellationChange({ maxLineThickness: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
            <label className="block text-sm text-mute">
              Stroke width scale: <span className="font-semibold text-ink">{constellation.strokeWidthScale.toFixed(2)}</span>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={constellation.strokeWidthScale}
                onChange={(event) =>
                  onConstellationChange({ strokeWidthScale: Number(event.target.value) })
                }
                className="mt-2 w-full"
              />
            </label>
          </>
        )}
        <VectorStats stats={stats} />
      </SectionCard>

      <SectionCard title="Scale" description="출력 해상도와 렌더링 방식을 지정합니다.">
        <ResolutionControls
          options={scale}
          onChange={onScaleChange}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
        />
      </SectionCard>

      <SectionCard title="Transparency" description="지정한 색상을 투명 처리합니다.">
        <ColorPickerPanel
          options={transparency}
          onChange={onTransparencyChange}
          onEyedropper={onEyedropper}
          eyedropperActive={eyedropperActive}
        />
      </SectionCard>

      <SectionCard title="Pipeline" description="처리 단계 상태를 표시합니다.">
        <div className="flex flex-wrap gap-2">
          {Object.entries(status).map(([key, value]) => (
            <span
              key={key}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusTone[value as ProcessingState[keyof ProcessingState]]
              }`}
            >
              {key}: {value}
            </span>
          ))}
        </div>
        <p className="text-xs text-mute">
          Source: {sourceWidth || 0} x {sourceHeight || 0}
        </p>
      </SectionCard>
    </div>
  );
}
