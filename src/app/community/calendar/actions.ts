"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventUrl = String(formData.get("eventUrl") ?? "").trim();

  if (!title || !eventDate) return { error: "Title and date are required." };

  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    title,
    event_date: eventDate,
    location: location || null,
    description: description || null,
    event_url: eventUrl || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/community/calendar");
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/community/calendar");
}
