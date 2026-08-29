import Link from "next/link";
import { FolderPlus, Store as StoreIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { MasterSet } from "@/types";
import PokemonAutoPopulateForm from "./PokemonAutoPopulateForm";
import TypeAutoPopulateForm from "./TypeAutoPopulateForm";
import ArtistAutoPopulateForm from "./ArtistAutoPopulateForm";

export default async function StorePage() {
  const supabase = await createClient();
  const { data: masterSets } = await supabase
    .from("master_sets")
    .select("*")
    .order("name", { ascending: true })
    .returns<MasterSet[]>();

  const sets = masterSets ?? [];

  return (
    <div>
      <h1 className="font-semibold text-lg flex items-center gap-2 mb-1">
        <StoreIcon size={18} className="text-amber" /> Store
      </h1>
      <p className="text-sm text-muted mb-5">
        Auto-populate a master set&apos;s checklist — pick which one when you buy.
      </p>

      {sets.length === 0 ? (
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          You don&apos;t have any master sets yet.
          <div className="mt-3">
            <Link
              href="/sets/master/new"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
            >
              <FolderPlus size={14} /> Create one first
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="bg-panel border border-border rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-3">Auto-populate by Pokémon</h2>
            <PokemonAutoPopulateForm masterSets={sets} />
          </div>

          <div className="bg-panel border border-border rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-3">Auto-populate by type</h2>
            <TypeAutoPopulateForm masterSets={sets} />
          </div>

          <div className="bg-panel border border-border rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-3">Auto-populate by artist</h2>
            <ArtistAutoPopulateForm masterSets={sets} />
          </div>
        </div>
      )}
    </div>
  );
}
