export function StatCard({
  label,
  value,
  hint,
  loading = false,
}: {
  label: string;
  value: number;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5 shadow-elev-1">
      <p className="text-sm text-muted">{label}</p>
      {loading ? (
        <span className="fx-shimmer mt-3 block h-12 w-20 rounded-md" aria-hidden />
      ) : (
        <p className="font-metric mt-3 text-5xl leading-none tracking-tight">{value}</p>
      )}
      {hint ? <p className="mt-3 text-sm text-tertiary">{hint}</p> : null}
    </article>
  );
}
