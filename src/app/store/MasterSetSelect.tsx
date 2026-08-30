import type { MasterSet } from "@/types";

export const NEW_MASTER_SET_VALUE = "__new__";

export default function MasterSetSelect({
  masterSets,
  value,
  onChange,
  newName,
  onNewNameChange,
}: {
  masterSets: MasterSet[];
  value: string;
  onChange: (id: string) => void;
  newName: string;
  onNewNameChange: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
          <option value={NEW_MASTER_SET_VALUE}>+ Create new master set</option>
        </select>
      </label>
      {value === NEW_MASTER_SET_VALUE && (
        <input
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder="New master set name"
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      )}
    </div>
  );
}
