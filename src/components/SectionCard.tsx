import { PropsWithChildren } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  description?: string;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-panel/90 p-4 shadow-glow backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-mute">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
