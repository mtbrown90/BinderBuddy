import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/types";
import CommunityTabs from "../CommunityTabs";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="font-semibold text-lg mb-3">Community</h1>
        <CommunityTabs />
        <p className="text-sm text-muted">Sign in to see your messages.</p>
      </div>
    );
  }

  const { data: myRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  const conversationIds = (myRows ?? []).map((r) => r.conversation_id);
  const lastReadByConversation = new Map((myRows ?? []).map((r) => [r.conversation_id, r.last_read_at]));

  let conversations: Conversation[] = [];
  if (conversationIds.length > 0) {
    const [{ data: convRows }, { data: otherParticipants }, { data: recentMessages }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, last_message_at, created_at")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles(username)")
        .in("conversation_id", conversationIds)
        .neq("user_id", user.id)
        .returns<{ conversation_id: string; user_id: string; profiles: { username: string | null } | null }[]>(),
      supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }),
    ]);

    const otherByConversation = new Map((otherParticipants ?? []).map((p) => [p.conversation_id, p]));
    const previewByConversation = new Map<string, string>();
    for (const m of recentMessages ?? []) {
      if (!previewByConversation.has(m.conversation_id)) previewByConversation.set(m.conversation_id, m.body);
    }

    conversations = (convRows ?? []).map((c) => {
      const other = otherByConversation.get(c.id);
      const lastRead = lastReadByConversation.get(c.id) ?? c.created_at;
      return {
        id: c.id,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        other_username: other?.profiles?.username ?? null,
        last_message_preview: previewByConversation.get(c.id) ?? null,
        unread: c.last_message_at > lastRead,
      };
    });
  }

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Community</h1>
      <p className="text-sm text-muted mb-3">Your trade conversations.</p>
      <CommunityTabs />

      {conversations.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          No conversations yet — message someone from the Trading board to start one.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/community/messages/${c.id}`}
              className="flex items-center gap-3 bg-panel border border-border rounded-xl px-4 py-3"
            >
              <MessageCircle size={16} className={c.unread ? "text-teal" : "text-muted"} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm truncate ${c.unread ? "font-bold" : "font-medium"}`}>
                  {c.other_username ?? "Unknown"}
                </div>
                {c.last_message_preview && (
                  <div className="text-xs text-muted truncate">{c.last_message_preview}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
