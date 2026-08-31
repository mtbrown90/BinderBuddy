import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { CalendarEvent, EventAttendance } from "@/types";
import CommunityTabs from "../CommunityTabs";
import EventList from "./EventList";

type EventRow = Omit<CalendarEvent, "author_username"> & { profiles: { username: string | null } | null };
type VendingRow = { event_id: string; profiles: { username: string | null } | null };
type MyAttendanceRow = { event_id: string; status: "going" | "vending" };
type GoingCountRow = { event_id: string; going_count: number };

export default async function CalendarPage() {
  const supabase = await createClient();

  const [{ data: eventRows }, {
    data: { user },
  }, admin, goingCountsResult, { data: vendingRows }] = await Promise.all([
    supabase
      .from("calendar_events")
      // event_attendees also references both calendar_events and profiles,
      // so a bare `profiles(username)` embed is now ambiguous to PostgREST
      // (it can't tell whether to join via calendar_events.user_id or via
      // event_attendees) — the explicit FK name disambiguates it.
      .select("*, profiles!calendar_events_user_id_fkey(username)")
      .order("event_date", { ascending: true })
      .returns<EventRow[]>(),
    supabase.auth.getUser(),
    isCurrentUserAdmin(),
    supabase.rpc("get_going_counts"),
    supabase
      .from("event_attendees")
      .select("event_id, profiles(username)")
      .eq("status", "vending")
      .returns<VendingRow[]>(),
  ]);
  const goingCounts = (goingCountsResult.data ?? []) as GoingCountRow[];

  let username: string | null = null;
  let myAttendanceRows: MyAttendanceRow[] = [];
  if (user) {
    const [{ data: profile }, { data: mine }] = await Promise.all([
      supabase.from("profiles").select("username").eq("id", user.id).single<{ username: string | null }>(),
      supabase
        .from("event_attendees")
        .select("event_id, status")
        .eq("user_id", user.id)
        .returns<MyAttendanceRow[]>(),
    ]);
    username = profile?.username ?? null;
    myAttendanceRows = mine ?? [];
  }

  const goingCountByEvent = new Map((goingCounts ?? []).map((g) => [g.event_id, g.going_count]));
  const vendorsByEvent = new Map<string, string[]>();
  for (const row of vendingRows ?? []) {
    const name = row.profiles?.username;
    if (!name) continue;
    vendorsByEvent.set(row.event_id, [...(vendorsByEvent.get(row.event_id) ?? []), name]);
  }
  const myStatusByEvent = new Map(myAttendanceRows.map((r) => [r.event_id, r.status]));

  const events: CalendarEvent[] = (eventRows ?? []).map(({ profiles, ...e }) => ({
    ...e,
    author_username: profiles?.username ?? null,
  }));

  const attendanceByEvent: Record<string, EventAttendance> = {};
  for (const e of events) {
    attendanceByEvent[e.id] = {
      goingCount: goingCountByEvent.get(e.id) ?? 0,
      vendors: vendorsByEvent.get(e.id) ?? [],
      myStatus: myStatusByEvent.get(e.id) ?? null,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Community</h1>
      <p className="text-sm text-muted mb-3">Upcoming card shows and meetups.</p>
      <CommunityTabs />

      <EventList
        upcoming={upcoming}
        past={past}
        attendanceByEvent={attendanceByEvent}
        currentUserId={user?.id ?? null}
        isAdmin={admin}
        username={username}
      />
    </div>
  );
}
