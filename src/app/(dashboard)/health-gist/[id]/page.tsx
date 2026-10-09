import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GIST_CATEGORIES, GistActions, GistCommentForm, GistDisclaimer } from "@/components/medlink/gist";
import { formatRelativeTime } from "@/lib/utils";

export default async function GistPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("gist_posts").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: comments }, { data: stat }, { data: mine }, { data: follow }] = await Promise.all([
    supabase.from("gist_comments").select("id, author_name, body, created_at").eq("post_id", id).eq("moderation_status", "visible").order("created_at"),
    supabase.from("gist_post_stats").select("*").eq("post_id", id).maybeSingle(),
    supabase.from("gist_reactions").select("value").eq("post_id", id).eq("profile_id", user.id).maybeSingle(),
    supabase.from("gist_follows").select("followee_id").eq("follower_id", user.id).eq("followee_id", p.author_id).maybeSingle(),
  ]);

  return (
    <div className="animate-fade-in">
      <Header title="Health Gist" subtitle={GIST_CATEGORIES[p.category]} />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <Link href="/health-gist" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />All posts</Link>
        <GistDisclaimer />
        {p.moderation_status !== "visible" && <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">This post is {p.moderation_status.replace("_", " ")} by moderators.</p>}
        <Card><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-[#64748B]">
            <span>{p.author_name ?? "Member"} · {formatRelativeTime(p.created_at)}</span>
            <Badge variant="outline">{GIST_CATEGORIES[p.category]}</Badge>
          </div>
          <h2 className="text-lg font-semibold">{p.title}</h2>
          <p className="text-sm whitespace-pre-wrap text-[#374151]">{p.body}</p>
          <GistActions postId={p.id} authorId={p.author_id} myReaction={(mine?.value as -1 | 1 | undefined) ?? 0}
            up={Number(stat?.thumbs_up ?? 0)} down={Number(stat?.thumbs_down ?? 0)} comments={Number(stat?.comments ?? 0)}
            following={!!follow} isSelf={p.author_id === user.id} />
        </CardContent></Card>
        <section className="space-y-2" aria-labelledby="c-h">
          <h3 id="c-h" className="text-sm font-semibold">Comments</h3>
          <GistCommentForm postId={p.id} />
          <ul className="space-y-2">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm">
                <p className="text-xs text-[#64748B]">{c.author_name ?? "Member"} · {formatRelativeTime(c.created_at)}</p>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
