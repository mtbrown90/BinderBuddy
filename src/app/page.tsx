import { TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CollectionEntry } from "@/types";
import StatCard from "@/components/StatCard";
import RecentlyAdded from "./RecentlyAdded";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("collection_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CollectionEntry[]>();

  const list = entries ?? [];
  const owned = list.filter((e) => e.status === "owned");
  const disposed = list.filter((e) => e.status !== "owned");

  const totalCards = owned.reduce((s, e) => s + e.quantity, 0);
  const totalPaid = owned.reduce((s, e) => s + (Number(e.price_paid) || 0) * e.quantity, 0);
  const totalMarket = owned.reduce((s, e) => s + (Number(e.market_price) || 0) * e.quantity, 0);
  const unrealizedGain = totalMarket - totalPaid;

  const realizedGain = disposed.reduce((s, e) => {
    const cost = (Number(e.price_paid) || 0) * e.quantity;
    const proceeds =
      e.status === "sold"
        ? Number(e.sold_price) || 0
        : (Number(e.traded_cash_received) || 0) + (Number(e.traded_for_card_value) || 0);
    return s + (proceeds - cost);
  }, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard label="Cards owned" value={totalCards} />
        <StatCard label="Spent" value={`$${totalPaid.toFixed(2)}`} />
        <StatCard label="Market value" value={`$${totalMarket.toFixed(2)}`} />
        <StatCard
          label="Unrealized gain / loss"
          value={
            <span className="flex items-center gap-1.5">
              {unrealizedGain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {unrealizedGain >= 0 ? "+" : ""}
              {unrealizedGain.toFixed(2)}
            </span>
          }
          valueClassName={unrealizedGain >= 0 ? "text-good" : "text-bad"}
        />
        <StatCard
          label="Realized gain / loss"
          value={
            <span className="flex items-center gap-1.5">
              {realizedGain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {realizedGain >= 0 ? "+" : ""}
              {realizedGain.toFixed(2)}
            </span>
          }
          valueClassName={realizedGain >= 0 ? "text-good" : "text-bad"}
        />
      </div>

      <RecentlyAdded owned={owned} />
    </div>
  );
}
