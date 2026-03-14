import { useEffect, useRef, useState } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { PreviewPane } from './components/PreviewPane';
import { ProgressModal } from './components/ProgressModal';
import {
  AppMode,
  ConstellationOptions,
  PreprocessOptions,
  ProcessingState,
  ScaleOptions,
  TransparencyOptions,
  VectorStatsData,
  VectorizeOptions,
} from './types';
import { buildDownloadName, readFileAsDataUrl } from './utils/file';
import { colorToAlpha } from './utils/colorToAlpha';
import { downloadCanvasAsPng } from './utils/download';
import {
  canvasToObjectUrl,
  createCanvas,
  disposeCanvas,
  hexToRgb,
  loadImage,
  rgbaToHex,
  sampleCanvasColor,
} from './utils/image';
import { preprocessImage } from './utils/preprocess';
import { vectorizeConstellation } from './utils/constellation';
import { renderSvgToCanvas } from './utils/renderSvgToCanvas';
import { simplifySvg } from './utils/simplifySvg';
import { vectorizeImageData } from './utils/vectorize';

const initialPreprocess: PreprocessOptions = {
  threshold: 170,
  invert: false,
  grayscale: true,
  noiseReduction: true,
  simplifyAmount: 2.5,
};

const initialVectorize: VectorizeOptions = {
  minPathArea: 10,
  minDimension: 2,
  simplifyTolerance: 2,
};

const initialConstellation: ConstellationOptions = {
  threshold: 72,
  invert: false,
  detectionScale: 2,
  minDotArea: 3,
  maxDotArea: 72,
  dotCircularity: 0.36,
  dotScale: 0.62,
  minLineLength: 6,
  maxLineThickness: 2.2,
  strokeWidthScale: 0.72,
  endpointSnapDistance: 14,
  microDotArea: 1,
  microLineLength: 2,
};

const initialScale: ScaleOptions = {
  preset: 'custom',
  width: 4096,
  height: 4096,
  smoothing: true,
  background: 'transparent',
  postProcess: 'light-sharpen',
};

const initialTransparency: TransparencyOptions = {
  enabled: true,
  targetHex: '#ffffff',
  tolerance: 14,
  mode: 'rgb-strict',
};

const initialStatus: ProcessingState = {
  upload: 'idle',
  preprocess: 'idle',
  vectorize: 'idle',
  render: 'idle',
  transparency: 'idle',
};

function flushUiFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('cleanup');
  const [file, setFile] = useState<File | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [vectorSvg, setVectorSvg] = useState<string | null>(null);
  const [finalPreview, setFinalPreview] = useState<string | null>(null);
  const [debugOverlay, setDebugOverlay] = useState<string | null>(null);
  const [preprocess, setPreprocess] = useState<PreprocessOptions>(initialPreprocess);
  const [vectorize, setVectorize] = useState<VectorizeOptions>(initialVectorize);
  const [constellation, setConstellation] = useState<ConstellationOptions>(initialConstellation);
  const [scale, setScale] = useState<ScaleOptions>(initialScale);
  const [transparency, setTransparency] = useState<TransparencyOptions>(initialTransparency);
  const [stats, setStats] = useState<VectorStatsData | null>(null);
  const [status, setStatus] = useState<ProcessingState>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [browserMemoryMb, setBrowserMemoryMb] = useState<number | null>(null);
  const [uiNow, setUiNow] = useState(() => Date.now());

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const finalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processStartedAtRef = useRef<number | null>(null);
  const stageStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (originalSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(originalSrc);
      }
      if (debugOverlay?.startsWith('blob:')) {
        URL.revokeObjectURL(debugOverlay);
      }
      if (finalPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(finalPreview);
      }
    };
  }, [debugOverlay, finalPreview, originalSrc]);

  useEffect(() => {
    if (!busy) {
      return undefined;
    }

    const updateMemory = () => {
      const nextValue = performance.memory?.usedJSHeapSize
        ? performance.memory.usedJSHeapSize / (1024 * 1024)
        : null;
      setBrowserMemoryMb(nextValue);
      setUiNow(Date.now());
    };

    updateMemory();
    const interval = window.setInterval(updateMemory, 600);
    return () => window.clearInterval(interval);
  }, [busy]);

  const updateProcessingStatus = (patch: Partial<ProcessingState>) => {
    stageStartedAtRef.current = Date.now();
    setStatus((current) => ({ ...current, ...patch }));
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setBusy(false);
    disposeCanvas(originalCanvasRef.current);
    disposeCanvas(finalCanvasRef.current);
    setFile(selectedFile);
    setVectorSvg(null);
    setFinalPreview(null);
    setDebugOverlay(null);
    setStats(null);
    setStatus({
      ...initialStatus,
      upload: 'ready',
    });

    const dataUrl = await readFileAsDataUrl(selectedFile);
    const image = await loadImage(dataUrl);
    setOriginalSrc(dataUrl);
    setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
    const originalCanvas = createCanvas(image.naturalWidth, image.naturalHeight);
    const originalContext = originalCanvas.getContext('2d');
    if (originalContext) {
      originalContext.drawImage(image, 0, 0);
      originalCanvasRef.current = originalCanvas;
    }

    if (scale.preset !== 'custom') {
      const multiplier = scale.preset === '2x' ? 2 : 4;
      setScale((current) => ({
        ...current,
        width: image.naturalWidth * multiplier,
        height: image.naturalHeight * multiplier,
      }));
    }
  };

  const handleProcess = async () => {
    if (!originalSrc || !file) {
      setError('먼저 이미지를 업로드하세요.');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      processStartedAtRef.current = Date.now();
      updateProcessingStatus({
        preprocess: 'running',
        vectorize: 'idle',
        render: 'idle',
        transparency: 'idle',
      });
      await flushUiFrame();

      const image = await loadImage(originalSrc);
      let svg = '';
      let nextStats: VectorStatsData;

      if (appMode === 'constellation') {
        updateProcessingStatus({
          preprocess: 'done',
          vectorize: 'running',
          render: 'idle',
          transparency: 'idle',
        });
        await flushUiFrame();

        const result = vectorizeConstellation(image, constellation);
        svg = result.svg;
        nextStats = result.stats;
        const overlayUrl = await canvasToObjectUrl(result.debugOverlayCanvas);
        disposeCanvas(result.debugOverlayCanvas);
        setDebugOverlay((current) => {
          if (current?.startsWith('blob:')) {
            URL.revokeObjectURL(current);
          }
          return overlayUrl;
        });
      } else {
        setDebugOverlay(null);
        const preprocessed = preprocessImage(image, preprocess);
        updateProcessingStatus({
          preprocess: 'done',
          vectorize: 'running',
          render: 'idle',
          transparency: 'idle',
        });
        await flushUiFrame();

        const rawSvg = vectorizeImageData(preprocessed.imageData);
        const simplified = simplifySvg(rawSvg, {
          ...vectorize,
          simplifyTolerance: vectorize.simplifyTolerance + preprocess.simplifyAmount / 2,
        });
        svg = simplified.svg;
        nextStats = simplified.stats;
      }

      setVectorSvg(svg);
      setStats(nextStats);
      updateProcessingStatus({ vectorize: 'done', render: 'running' });
      await flushUiFrame();

      const renderedCanvas = await renderSvgToCanvas(svg, {
        width: scale.width,
        height: scale.height,
        smoothing: scale.smoothing,
        background: scale.background,
        postProcess: scale.postProcess,
      });

      updateProcessingStatus({
        render: 'done',
        transparency: transparency.enabled ? 'running' : 'idle',
      });
      await flushUiFrame();
      const outputCanvas = transparency.enabled
        ? colorToAlpha(renderedCanvas, {
            target: hexToRgb(transparency.targetHex),
            tolerance: transparency.tolerance,
            mode: transparency.mode,
          })
        : renderedCanvas;

      finalCanvasRef.current = outputCanvas;
      const finalPreviewUrl = await canvasToObjectUrl(outputCanvas);
      setFinalPreview((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return finalPreviewUrl;
      });
      updateProcessingStatus({
        transparency: transparency.enabled ? 'done' : 'idle',
      });
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : 'Processing failed.';
      setError(message);
    } finally {
      setBusy(false);
      processStartedAtRef.current = null;
      stageStartedAtRef.current = null;
    }
  };

  const handleDownload = async () => {
    if (!finalCanvasRef.current || !file) {
      return;
    }
    await downloadCanvasAsPng(finalCanvasRef.current, buildDownloadName(file.name));
  };

  const handleReset = () => {
    disposeCanvas(originalCanvasRef.current);
    disposeCanvas(finalCanvasRef.current);
    setFile(null);
    setOriginalSrc(null);
    setVectorSvg(null);
    setFinalPreview(null);
    setDebugOverlay(null);
    setStats(null);
    setError(null);
    setStatus(initialStatus);
    setBusy(false);
    processStartedAtRef.current = null;
    stageStartedAtRef.current = null;
    setSourceSize({ width: 0, height: 0 });
    originalCanvasRef.current = null;
    finalCanvasRef.current = null;
  };

  const estimatedMemoryMb = (() => {
    const sourcePixels = sourceSize.width * sourceSize.height;
    const detectionPixels =
      appMode === 'constellation'
        ? sourcePixels * constellation.detectionScale * constellation.detectionScale
        : sourcePixels;
    const outputPixels = scale.width * scale.height;
    const approximateBytes =
      sourcePixels * 4 * 2 +
      detectionPixels * 4 * 5 +
      outputPixels * 4 * 3;
    return approximateBytes / (1024 * 1024);
  })();

  const progressInfo = (() => {
    if (status.transparency === 'done') {
      return {
        progress: 100,
        label: 'Finalizing transparent PNG preview.',
        currentTask: 'PNG preview finalize',
      };
    }
    if (status.transparency === 'running') {
      return {
        progress: 92,
        label: 'Applying color-to-alpha cleanup.',
        currentTask: 'Alpha cleanup pass',
      };
    }
    if (status.render === 'done') {
      return {
        progress: 84,
        label: 'Render complete. Preparing post-processing.',
        currentTask: 'Render output ready',
      };
    }
    if (status.render === 'running') {
      return {
        progress: 72,
        label: 'Rendering high-resolution bitmap from vector data.',
        currentTask: 'High-resolution render',
      };
    }
    if (status.vectorize === 'done') {
      return {
        progress: 58,
        label: 'Vector reconstruction complete. Queueing render.',
        currentTask: 'Vector stage complete',
      };
    }
    if (status.vectorize === 'running') {
      return {
        progress: 44,
        label:
          appMode === 'constellation'
            ? 'Tracing constellation nodes and segments.'
            : 'Generating and cleaning SVG paths.',
        currentTask:
          appMode === 'constellation'
            ? 'Constellation node/edge tracing'
            : 'SVG path generation',
      };
    }
    if (status.preprocess === 'done') {
      return {
        progress: 28,
        label: 'Mask extraction complete. Starting vector step.',
        currentTask: 'Preprocess complete',
      };
    }
    if (status.preprocess === 'running') {
      return {
        progress: 16,
        label: 'Preparing masks and analysis buffers.',
        currentTask: 'Mask preparation',
      };
    }
    if (status.upload === 'ready') {
      return {
        progress: 6,
        label: 'Source ready. Waiting to process.',
        currentTask: 'Ready',
      };
    }
    return { progress: 0, label: 'Waiting for work.', currentTask: 'Idle' };
  })();

  const stageElapsedMs = stageStartedAtRef.current ? Math.max(0, uiNow - stageStartedAtRef.current) : 0;
  const wallClockLabel = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(uiNow);

  const handleSampleColor = async (x: number, y: number) => {
    try {
      if (window.EyeDropper && eyedropperActive) {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        setTransparency((current) => ({ ...current, targetHex: result.sRGBHex }));
        setEyedropperActive(false);
        return;
      }
    } catch {
      // Fall back to canvas sampling.
    }

    if (!originalCanvasRef.current) {
      return;
    }

    const color = sampleCanvasColor(originalCanvasRef.current, x, y);
    setTransparency((current) => ({ ...current, targetHex: rgbaToHex(color.r, color.g, color.b) }));
    setEyedropperActive(false);
  };

  return (
    <div className="min-h-screen bg-mesh text-ink">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[2rem] border border-white/10 bg-panel/80 px-6 py-5 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent">Vector Cleanup Upscaler</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                Raster cleanup, vector rebuild, upscale, transparency export.
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  ['cleanup', 'Cleanup Upscaler'],
                  ['constellation', 'Constellation Vectorizer'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAppMode(mode)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      appMode === mode
                        ? 'bg-accent text-slate-950'
                        : 'bg-white/10 text-ink hover:bg-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="max-w-2xl text-sm text-mute">
              {appMode === 'cleanup'
                ? '선화와 기하학 그래픽에 최적화된 일반 정리 파이프라인입니다. 업로드 후 벡터화하고, 고해상도 PNG로 다시 렌더링한 뒤 지정 색상을 투명하게 제거할 수 있습니다.'
                : '별자리 그래픽처럼 점과 선이 분명한 이미지를 위한 전용 파이프라인입니다. 점은 정확한 벡터 원으로, 선은 굵기와 좌표를 가진 벡터 선분으로 재배치합니다.'}
            </p>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <ControlsPanel
              fileName={file?.name}
              appMode={appMode}
              preprocess={preprocess}
              vectorize={vectorize}
              constellation={constellation}
              scale={scale}
              transparency={transparency}
              status={status}
              stats={stats}
              sourceWidth={sourceSize.width}
              sourceHeight={sourceSize.height}
              eyedropperActive={eyedropperActive}
              onFileSelect={(selected) => void handleFileSelect(selected)}
              onPreprocessChange={(patch) => setPreprocess((current) => ({ ...current, ...patch }))}
              onVectorizeChange={(patch) => setVectorize((current) => ({ ...current, ...patch }))}
              onConstellationChange={(patch) =>
                setConstellation((current) => ({ ...current, ...patch }))
              }
              onScaleChange={(patch) => setScale((current) => ({ ...current, ...patch }))}
              onTransparencyChange={(patch) => setTransparency((current) => ({ ...current, ...patch }))}
              onEyedropper={() => setEyedropperActive((current) => !current)}
            />
          </aside>

          <section className={`grid min-w-0 gap-6 ${appMode === 'constellation' ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
            <PreviewPane
              title="Original Preview"
              src={originalSrc}
              zoom={zoom}
              onZoomChange={setZoom}
              checkerboard
              onSampleColor={handleSampleColor}
              eyedropperActive={eyedropperActive}
            />
            <PreviewPane
              title="Vector Preview"
              src={vectorSvg}
              isSvg
              zoom={zoom}
              onZoomChange={setZoom}
            />
            <PreviewPane
              title="Final PNG Preview"
              src={finalPreview}
              zoom={zoom}
              onZoomChange={setZoom}
              checkerboard
            />
            {appMode === 'constellation' ? (
              <PreviewPane
                title="Debug Overlay"
                src={debugOverlay}
                zoom={zoom}
                onZoomChange={setZoom}
                checkerboard
              />
            ) : null}
          </section>
        </main>

        <div className="sticky bottom-4 mt-6 rounded-[2rem] border border-white/10 bg-panelSoft/85 p-4 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Processing controls</p>
              <p className="text-xs text-mute">
                Output: {scale.width} x {scale.height}
                {stats ? ` | Paths: ${stats.pathCount}` : ''}
              </p>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleProcess()}
                disabled={busy || !originalSrc}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Processing...' : 'Process'}
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={!finalPreview}
                className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download PNG
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-white/5 px-5 py-3 text-sm font-semibold text-mute transition hover:bg-white/10 hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
      <ProgressModal
        open={busy}
        status={status}
        progress={progressInfo.progress}
        label={progressInfo.label}
        currentTask={progressInfo.currentTask}
        stageElapsedMs={stageElapsedMs}
        wallClockLabel={wallClockLabel}
        browserMemoryMb={browserMemoryMb}
        estimatedMemoryMb={estimatedMemoryMb}
      />
    </div>
  );
}
