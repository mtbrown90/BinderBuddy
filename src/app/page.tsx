import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CollectionEntry } from "@/types";
import StatCard from "@/components/StatCard";
import CardTile from "@/components/CardTile";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("collection_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CollectionEntry[]>();

  const list = entries ?? [];
  const totalCards = list.reduce((s, e) => s + e.quantity, 0);
  const totalPaid = list.reduce((s, e) => s + (Number(e.price_paid) || 0) * e.quantity, 0);
  const totalMarket = list.reduce((s, e) => s + (Number(e.market_price) || 0) * e.quantity, 0);
  const gain = totalMarket - totalPaid;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard label="Cards owned" value={totalCards} />
        <StatCard label="Spent" value={`$${totalPaid.toFixed(2)}`} />
        <StatCard label="Market value" value={`$${totalMarket.toFixed(2)}`} />
        <StatCard
          label="Gain / loss"
          value={
            <span className="flex items-center gap-1.5">
              {gain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {gain >= 0 ? "+" : ""}
              {gain.toFixed(2)}
            </span>
          }
          valueClassName={gain >= 0 ? "text-good" : "text-bad"}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Recently added</h2>
        <Link href="/sets" className="text-teal text-sm font-medium">
          Browse sets →
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          Your binder&apos;s empty. Browse a set and add your first card.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {list.slice(0, 12).map((e) => (
            <Link key={e.id} href="/collection">
              <CardTile name={e.card_name} imageUrl={e.image_url} variationLabel={e.variation_type} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
