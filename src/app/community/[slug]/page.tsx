import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { DiscussionCategory, DiscussionThread } from "@/types";
import ThreadList from "./ThreadList";

type ThreadRow = Omit<DiscussionThread, "author_username"> & { profiles: { username: string | null } | null };

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: category }, { data: threadRows }, {
    data: { user },
  }] = await Promise.all([
    supabase.from("discussion_categories").select("*").eq("slug", slug).single<DiscussionCategory>(),
    supabase
      .from("discussion_threads")
      .select("*, profiles(username)")
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .returns<ThreadRow[]>(),
    supabase.auth.getUser(),
  ]);

  if (!category) notFound();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single<{ username: string | null }>();
    username = profile?.username ?? null;
  }

  const threads: DiscussionThread[] = (threadRows ?? []).map(({ profiles, ...t }) => ({
    ...t,
    author_username: profiles?.username ?? null,
  }));

  return (
    <div>
      <Link href="/community" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> Community
      </Link>
      <h1 className="font-semibold text-lg mb-1">{category.name}</h1>
      {category.description && <p className="text-sm text-muted mb-4">{category.description}</p>}

      <ThreadList categoryId={category.id} categorySlug={slug} threads={threads} username={username} />
    </div>
  );
}
