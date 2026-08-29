import Link from "next/link";
import { FolderPlus, Sparkles, Upload } from "lucide-react";
import { listSets } from "@/lib/pokemontcg";
import { createClient } from "@/lib/supabase/server";
import type { CustomSet } from "@/types";

export default async function SetsPage() {
  const supabase = await createClient();
  const [officialSets, { data: customSets }] = await Promise.all([
    listSets().catch(() => []),
    supabase
      .from("custom_sets")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CustomSet[]>(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Your custom sets</h2>
          <Link
            href="/sets/custom/new"
            className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
          >
            <FolderPlus size={14} /> New set
          </Link>
        </div>
        {!customSets || customSets.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            No custom sets yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {customSets.map((s) => (
              <Link
                key={s.id}
                href={`/sets/custom/${s.id}`}
                className="flex items-center gap-2 bg-panel border border-border rounded-xl px-4 py-3"
              >
                <Sparkles size={14} className="text-amber" />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-muted text-xs ml-auto">{s.game}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Pokémon TCG sets</h2>
          <Link
            href="/collection/import"
            className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
          >
            <Upload size={14} /> Import Excel
          </Link>
        </div>
        {officialSets.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            Couldn&apos;t load official sets right now.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {officialSets.map((s) => (
              <Link
                key={s.id}
                href={`/sets/${s.id}`}
                className="flex flex-col items-center gap-2 bg-panel border border-border rounded-xl px-3 py-4 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.images.logo} alt={s.name} className="h-10 object-contain" />
                <span className="text-xs font-medium leading-tight">{s.name}</span>
                <span className="text-[10px] text-muted">{s.releaseDate}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
