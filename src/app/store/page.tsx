import { Store as StoreIcon, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listSets } from "@/lib/pokemontcg";
import { getMasterSetLimitInfo } from "@/lib/masterSetLimit";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import type { MasterSet } from "@/types";
import PokemonAutoPopulateForm from "./PokemonAutoPopulateForm";
import TypeAutoPopulateForm from "./TypeAutoPopulateForm";
import ArtistAutoPopulateForm from "./ArtistAutoPopulateForm";
import PlaceholderPdfForm from "./PlaceholderPdfForm";

export default async function StorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: masterSets }, officialSets, masterSetLimit] = await Promise.all([
    supabase.from("master_sets").select("*").order("name", { ascending: true }).returns<MasterSet[]>(),
    listSets().catch(() => []),
    user
      ? getMasterSetLimitInfo(supabase, user.id)
      : Promise.resolve({ ownedCount: 0, unlimited: false, canCreateFree: false, hasBillingHistory: false }),
  ]);

  const sets = masterSets ?? [];

  return (
    <div>
      <h1 className="font-semibold text-lg flex items-center gap-2 mb-1">
        <StoreIcon size={18} className="text-amber" /> Store
      </h1>
      <p className="text-sm text-muted mb-5">
        Auto-populate a master set&apos;s checklist — pick which one when you buy.
      </p>

      <div className="flex flex-col gap-5">
        <div className="bg-panel border border-teal/40 rounded-2xl p-4">
          <h2 className="flex items-center gap-1.5 font-semibold text-sm mb-3">
            <Sparkles size={14} className="text-teal" /> Unlimited master sets
          </h2>
          <p className="text-xs text-muted mb-3">
            1 master set is free ({masterSetLimit.ownedCount} owned so far) — beyond that, either buy new ones
            below (auto-populated, no cap) or subscribe here so every new one is free too.
          </p>
          <SubscriptionPanel unlimited={masterSetLimit.unlimited} hasBillingHistory={masterSetLimit.hasBillingHistory} />
        </div>

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

        <div className="bg-panel border border-border rounded-2xl p-4">
          <h2 className="font-semibold text-sm mb-3">Printable placeholder PDF</h2>
          <PlaceholderPdfForm
            masterSets={sets}
            officialSets={officialSets.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </div>
  );
}
