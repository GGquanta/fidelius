export interface ChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function StackedBar({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label="分类分布">
        {segments.map((item) =>
          item.value ? (
            <span
              key={item.id}
              className="h-full"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
              title={`${item.label} ${item.value}`}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} aria-hidden />
            <span className="text-muted">{item.label}</span>
            <span className="font-metric text-xs text-tertiary">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DonutRing({
  segments,
  size = 160,
}: {
  segments: ChartSegment[];
  size?: number;
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" aria-hidden>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--sunken)" strokeWidth="16" />
        {total
          ? segments.map((item) => {
              const length = (item.value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const current = offset;
              offset += length;
              return (
                <circle
                  key={item.id}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="16"
                  strokeDasharray={dash}
                  strokeDashoffset={-current}
                  transform="rotate(-90 80 80)"
                />
              );
            })
          : null}
        <text
          x="80"
          y="84"
          textAnchor="middle"
          className="font-metric fill-ink"
          style={{ fontSize: 20 }}
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} aria-hidden />
            <span className="text-muted">{item.label}</span>
            <span className="font-metric text-xs text-tertiary">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeekBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-1.5" role="img" aria-label="近 12 周更新">
      {values.map((value, index) => (
        <span
          key={index}
          className="flex-1 rounded-sm bg-accent-soft"
          style={{ height: `${Math.max(8, (value / max) * 100)}%`, background: value ? "var(--accent)" : "var(--sunken)" }}
          title={`${value}`}
        />
      ))}
    </div>
  );
}
