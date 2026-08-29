import type { MasterSet } from "@/types";

export default function MasterSetSelect({
  masterSets,
  value,
  onChange,
}: {
  masterSets: MasterSet[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted">
      Add to master set
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
      >
        {masterSets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
