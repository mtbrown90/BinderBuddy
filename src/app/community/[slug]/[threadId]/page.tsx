import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { DiscussionReply, DiscussionThread } from "@/types";
import ThreadDetail from "./ThreadDetail";

type ThreadRow = Omit<DiscussionThread, "author_username"> & { profiles: { username: string | null } | null };
type ReplyRow = Omit<DiscussionReply, "author_username"> & { profiles: { username: string | null } | null };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ slug: string; threadId: string }>;
}) {
  const { slug, threadId } = await params;
  const supabase = await createClient();

  const [{ data: threadRow }, { data: replyRows }, {
    data: { user },
  }, admin] = await Promise.all([
    supabase
      .from("discussion_threads")
      .select("*, profiles(username)")
      .eq("id", threadId)
      .single<ThreadRow>(),
    supabase
      .from("discussion_replies")
      .select("*, profiles(username)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .returns<ReplyRow[]>(),
    supabase.auth.getUser(),
    isCurrentUserAdmin(),
  ]);

  if (!threadRow) notFound();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single<{ username: string | null }>();
    username = profile?.username ?? null;
  }

  const { profiles: threadProfile, ...threadFields } = threadRow;
  const thread: DiscussionThread = { ...threadFields, author_username: threadProfile?.username ?? null };
  const replies: DiscussionReply[] = (replyRows ?? []).map(({ profiles, ...r }) => ({
    ...r,
    author_username: profiles?.username ?? null,
  }));

  return (
    <div>
      <Link href={`/community/${slug}`} className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> Back
      </Link>
      <ThreadDetail
        categorySlug={slug}
        thread={thread}
        replies={replies}
        currentUserId={user?.id ?? null}
        isAdmin={admin}
        username={username}
      />
    </div>
  );
}
