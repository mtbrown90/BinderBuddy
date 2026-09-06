import { listSets } from "@/lib/pokemontcg";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { MasterSet } from "@/types";
import SetsBrowser from "./SetsBrowser";

export default async function SetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [officialSets, { data: masterSets }, { data: entries }, admin] = await Promise.all([
    listSets().catch(() => []),
    supabase
      .from("master_sets")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<MasterSet[]>(),
    // RLS also grants read access to any row another user has marked
    // is_for_trade (for the Trading Board) — without this explicit
    // filter, those cards would inflate this user's owned counts.
    supabase.from("collection_entries").select("set_name, card_number").eq("user_id", user?.id ?? ""),
    isCurrentUserAdmin(),
  ]);

  // Distinct card numbers owned per official set — a card owned in two
  // variations (Normal + Holofoil) still only counts once toward "3/145
  // owned", matching how a completion count is normally understood.
  const ownedNumbersBySet = new Map<string, Set<string>>();
  for (const e of entries ?? []) {
    if (!e.set_name || !e.card_number) continue;
    if (!ownedNumbersBySet.has(e.set_name)) ownedNumbersBySet.set(e.set_name, new Set());
    ownedNumbersBySet.get(e.set_name)!.add(e.card_number);
  }
  const ownedCountsBySet = Object.fromEntries(
    [...ownedNumbersBySet.entries()].map(([setName, numbers]) => [setName, numbers.size])
  );

  return (
    <SetsBrowser
      officialSets={officialSets.map((s) => ({
        id: s.id,
        name: s.name,
        series: s.series,
        releaseDate: s.releaseDate,
        printedTotal: s.printedTotal,
        images: { logo: s.images.logo },
      }))}
      masterSets={masterSets ?? []}
      ownedCountsBySet={ownedCountsBySet}
      isAdmin={admin}
    />
  );
}
