import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/types";
import MessageThread from "./MessageThread";

type MessageRow = Omit<Message, "author_username"> & { profiles: { username: string | null } | null };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // RLS ("read own conversations") returns null for a conversation the
  // signed-in user isn't a participant of — that's the not-found gate.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) notFound();

  const [{ data: messageRows }, { data: otherParticipant }] = await Promise.all([
    supabase
      .from("messages")
      .select("*, profiles(username)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<MessageRow[]>(),
    supabase
      .from("conversation_participants")
      .select("profiles(username)")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .maybeSingle<{ profiles: { username: string | null } | null }>(),
  ]);

  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  const messages: Message[] = (messageRows ?? []).map(({ profiles, ...m }) => ({
    ...m,
    author_username: profiles?.username ?? null,
  }));
  const otherUsername = otherParticipant?.profiles?.username ?? null;

  return (
    <div>
      <Link href="/community/messages" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> Messages
      </Link>
      <h1 className="font-semibold text-lg mb-4">{otherUsername ?? "Conversation"}</h1>
      <MessageThread
        conversationId={conversationId}
        messages={messages}
        currentUserId={user.id}
        otherUsername={otherUsername}
      />
    </div>
  );
}
