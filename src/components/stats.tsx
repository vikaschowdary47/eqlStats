import type { ProjectStats } from "@/lib/data";
import { timeAgo } from "./ui";

/** Four numbers and a 14-day health strip. Deliberately simple. */
export function StatsStrip({ stats, hideViews = false }: { stats: ProjectStats; hideViews?: boolean }) {
  const tiles = [
    {
      label: "Services healthy",
      value: stats.servicesTotal ? `${stats.servicesOk} of ${stats.servicesTotal}` : "None yet",
    },
    { label: "Uptime, last 7 days", value: stats.uptime7d === null ? "No data" : `${stats.uptime7d}%` },
    { label: "Last production deploy", value: stats.lastDeployAt ? timeAgo(stats.lastDeployAt) : "Not tracked" },
    { label: "Share link views, 30 days", value: String(stats.shareViews30d) },
  ].slice(0, hideViews ? 3 : 4);

  return (
    <section aria-label="Project stats" className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
      <dl className={`grid grid-cols-2 gap-px bg-line ${tiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tiles.map((t, i) => (
          <div key={t.label} className={`bg-surface px-5 py-4 ${tiles.length === 3 && i === 2 ? "col-span-2 lg:col-span-1" : ""}`}>
            <dt className="text-[13px] text-ink-3">{t.label}</dt>
            <dd className="mt-1 font-display text-[22px] font-semibold tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>
      <HealthStrip daily={stats.daily} />
    </section>
  );
}

function HealthStrip({ daily }: { daily: ProjectStats["daily"] }) {
  const color = (r: number | null) => (r === null ? "var(--line)" : r >= 0.99 ? "var(--ok)" : r >= 0.8 ? "var(--warn)" : "var(--down)");
  const describe = (r: number | null) => (r === null ? "no checks" : `${Math.round(r * 100)}% healthy`);
  return (
    <div className="border-t border-line px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] text-ink-3">Daily health, last 14 days</p>
        <p className="text-[12px] text-ink-3">Today</p>
      </div>
      <ol className="mt-2 flex h-7 gap-1" aria-label="Daily health">
        {daily.map((d) => (
          <li
            key={d.day}
            title={`${d.day}: ${describe(d.ratio)}`}
            aria-label={`${d.day}: ${describe(d.ratio)}`}
            className="flex-1 rounded-[3px]"
            style={{ background: color(d.ratio) }}
          />
        ))}
      </ol>
    </div>
  );
}
