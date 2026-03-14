export type BackgroundMode = 'transparent' | 'white' | 'black';

export type ScalePreset = '2x' | '4x' | 'custom';

export type PostProcessMode = 'none' | 'light-sharpen' | 'crisp-edge';

export type ColorMatchMode = 'rgb-strict' | 'euclidean';

export interface PreprocessOptions {
  threshold: number;
  invert: boolean;
  grayscale: boolean;
  noiseReduction: boolean;
  simplifyAmount: number;
}

export interface VectorizeOptions {
  minPathArea: number;
  minDimension: number;
  simplifyTolerance: number;
}

export interface ScaleOptions {
  preset: ScalePreset;
  width: number;
  height: number;
  smoothing: boolean;
  background: BackgroundMode;
  postProcess: PostProcessMode;
}

export interface TransparencyOptions {
  enabled: boolean;
  targetHex: string;
  tolerance: number;
  mode: ColorMatchMode;
}

export interface VectorStatsData {
  pathCount: number;
  width: number;
  height: number;
  removedPaths: number;
}

export interface ProcessingState {
  upload: 'idle' | 'ready';
  preprocess: 'idle' | 'running' | 'done';
  vectorize: 'idle' | 'running' | 'done';
  render: 'idle' | 'running' | 'done';
  transparency: 'idle' | 'running' | 'done';
}
