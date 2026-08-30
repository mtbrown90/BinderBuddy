import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { CollectionEntry, TradeListing, TradeWant } from "@/types";
import CommunityTabs from "../CommunityTabs";
import TradingBoard from "./TradingBoard";

type WantRow = Omit<TradeWant, "author_username"> & { profiles: { username: string | null } | null };

export default async function TradingPage() {
  const supabase = await createClient();

  const [{ data: listingRows }, { data: wantRows }, {
    data: { user },
  }, admin] = await Promise.all([
    // collection_entries.user_id references auth.users (not profiles, unlike
    // every table added for Community), so PostgREST can't auto-embed
    // profiles(username) here — fetched separately and merged below instead.
    // RLS restricts this to is_for_trade = true rows.
    supabase
      .from("collection_entries")
      .select("*")
      .eq("is_for_trade", true)
      .eq("status", "owned")
      .returns<CollectionEntry[]>(),
    supabase
      .from("trade_wants")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false })
      .returns<WantRow[]>(),
    supabase.auth.getUser(),
    isCurrentUserAdmin(),
  ]);

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single<{ username: string | null }>();
    username = profile?.username ?? null;
  }

  const listingUserIds = [...new Set((listingRows ?? []).map((l) => l.user_id))];
  const usernameByUserId = new Map<string, string | null>();
  if (listingUserIds.length > 0) {
    const { data: listingProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", listingUserIds)
      .returns<{ id: string; username: string | null }[]>();
    for (const p of listingProfiles ?? []) usernameByUserId.set(p.id, p.username);
  }

  const listings: TradeListing[] = (listingRows ?? []).map((l) => ({
    ...l,
    author_username: usernameByUserId.get(l.user_id) ?? null,
  }));
  const wants: TradeWant[] = (wantRows ?? []).map(({ profiles, ...w }) => ({
    ...w,
    author_username: profiles?.username ?? null,
  }));

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Community</h1>
      <p className="text-sm text-muted mb-3">Trade cards with other collectors.</p>
      <CommunityTabs />

      <TradingBoard listings={listings} wants={wants} currentUserId={user?.id ?? null} isAdmin={admin} username={username} />
    </div>
  );
}
