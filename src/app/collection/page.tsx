import Link from "next/link";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CollectionEntry } from "@/types";
import CollectionGrid from "./CollectionGrid";

export default async function CollectionPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("collection_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CollectionEntry[]>();

  const list = entries ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-semibold text-lg">My collection</h1>
        <Link
          href="/collection/import"
          className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
        >
          <Upload size={14} /> Import Excel
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          No cards in your collection yet. Browse a set to add your first card.
        </div>
      ) : (
        <CollectionGrid entries={list} />
      )}
    </div>
  );
}
