import { createClient } from "@/lib/supabase/server";
import type { CollectionEntry, MasterSet } from "@/types";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS also grants read access to any row another user has marked
  // is_for_trade (for the Trading Board) — without this explicit filter,
  // those rows would leak into this user's own stats and card lists.
  const [{ data: entries }, { data: masterSets }] = await Promise.all([
    supabase
      .from("collection_entries")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .returns<CollectionEntry[]>(),
    supabase.from("master_sets").select("*").order("name", { ascending: true }).returns<MasterSet[]>(),
  ]);

  const list = entries ?? [];
  const sets = masterSets ?? [];

  // Which checklist cards belong to each of the user's master sets, so the
  // "Master Set" view can tell which owned cards are members of one.
  const masterSetCardKeys: Record<string, string[]> = {};
  if (sets.length > 0) {
    const { data: cards } = await supabase
      .from("master_set_cards")
      .select("master_set_id, external_card_id, variation_type")
      .in(
        "master_set_id",
        sets.map((s) => s.id)
      );
    for (const c of cards ?? []) {
      const key = `${c.external_card_id}::${c.variation_type.toLowerCase()}`;
      (masterSetCardKeys[c.master_set_id] ??= []).push(key);
    }
  }

  return <DashboardView allEntries={list} masterSets={sets} masterSetCardKeys={masterSetCardKeys} />;
}
