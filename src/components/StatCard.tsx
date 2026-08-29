export default function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] bg-panel border border-border rounded-2xl px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}
