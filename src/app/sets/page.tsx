import { listSets } from "@/lib/pokemontcg";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { MasterSet } from "@/types";
import SetsBrowser from "./SetsBrowser";

export default async function SetsPage() {
  const supabase = await createClient();
  const [officialSets, { data: masterSets }, admin] = await Promise.all([
    listSets().catch(() => []),
    supabase
      .from("master_sets")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<MasterSet[]>(),
    isCurrentUserAdmin(),
  ]);

  return (
    <SetsBrowser
      officialSets={officialSets.map((s) => ({
        id: s.id,
        name: s.name,
        series: s.series,
        releaseDate: s.releaseDate,
        images: { logo: s.images.logo },
      }))}
      masterSets={masterSets ?? []}
      isAdmin={admin}
    />
  );
}
