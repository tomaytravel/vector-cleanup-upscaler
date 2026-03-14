import { VectorStatsData } from '../types';

interface VectorStatsProps {
  stats: VectorStatsData | null;
}

export function VectorStats({ stats }: VectorStatsProps) {
  if (!stats) {
    return <p className="text-sm text-mute">벡터화 전에는 통계가 표시되지 않습니다.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl bg-white/[0.04] p-3">
        <p className="text-mute">Path count</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{stats.pathCount}</p>
      </div>
      <div className="rounded-2xl bg-white/[0.04] p-3">
        <p className="text-mute">Removed</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{stats.removedPaths}</p>
      </div>
      <div className="rounded-2xl bg-white/[0.04] p-3">
        <p className="text-mute">Vector width</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{stats.width}</p>
      </div>
      <div className="rounded-2xl bg-white/[0.04] p-3">
        <p className="text-mute">Vector height</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{stats.height}</p>
      </div>
    </div>
  );
}
