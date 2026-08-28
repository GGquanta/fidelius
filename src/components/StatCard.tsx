export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5 shadow-elev-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-metric mt-3 text-5xl leading-none tracking-tight">{value}</p>
      {hint ? <p className="mt-3 text-sm text-tertiary">{hint}</p> : null}
    </article>
  );
}
