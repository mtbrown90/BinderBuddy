import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { CalendarEvent } from "@/types";
import CommunityTabs from "../CommunityTabs";
import EventList from "./EventList";

type EventRow = Omit<CalendarEvent, "author_username"> & { profiles: { username: string | null } | null };

export default async function CalendarPage() {
  const supabase = await createClient();

  const [{ data: eventRows }, {
    data: { user },
  }, admin] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*, profiles(username)")
      .order("event_date", { ascending: true })
      .returns<EventRow[]>(),
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

  const events: CalendarEvent[] = (eventRows ?? []).map(({ profiles, ...e }) => ({
    ...e,
    author_username: profiles?.username ?? null,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Community</h1>
      <p className="text-sm text-muted mb-3">Upcoming card shows and meetups.</p>
      <CommunityTabs />

      <EventList upcoming={upcoming} past={past} currentUserId={user?.id ?? null} isAdmin={admin} username={username} />
    </div>
  );
}
