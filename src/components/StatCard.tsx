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
    <article className="rounded-lg border border-line bg-surface p-4 shadow-elev-1 md:p-5">
      <p className="text-[12px] text-muted md:text-sm">{label}</p>
      {loading ? (
        <span className="fx-shimmer mt-2 block h-8 w-12 rounded-md md:mt-3 md:h-12 md:w-20" aria-hidden />
      ) : (
        <p className="font-metric mt-2 text-3xl leading-none tracking-tight md:mt-3 md:text-5xl">{value}</p>
      )}
      {hint ? <p className="mt-2 text-[12px] text-tertiary md:mt-3 md:text-sm">{hint}</p> : null}
    </article>
  );
}
