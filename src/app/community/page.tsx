import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { DiscussionCategory } from "@/types";

type CategoryRow = DiscussionCategory & { discussion_threads: { count: number }[] };

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("discussion_categories")
    .select("*, discussion_threads(count)")
    .order("sort_order", { ascending: true })
    .returns<CategoryRow[]>();

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Community</h1>
      <p className="text-sm text-muted mb-5">Discussion boards for Pokémon TCG collectors.</p>

      <div className="flex flex-col gap-3">
        {(categories ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/community/${c.slug}`}
            className="flex items-center justify-between gap-3 bg-panel border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageSquare size={18} className="text-teal shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-sm">{c.name}</div>
                {c.description && <div className="text-xs text-muted truncate">{c.description}</div>}
              </div>
            </div>
            <div className="text-xs text-muted shrink-0">
              {c.discussion_threads[0]?.count ?? 0} thread{c.discussion_threads[0]?.count === 1 ? "" : "s"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
