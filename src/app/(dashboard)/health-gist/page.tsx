import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GIST_CATEGORIES, GistActions, GistDisclaimer, NewGistPost } from "@/components/medlink/gist";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

export const metadata = { title: "Health Gist" };

export default async function HealthGistPage({ searchParams }: { searchParams: Promise<{ cat?: string; feed?: string }> }) {
  const { cat, feed } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let followees: string[] = [];
  const { data: follows } = await supabase.from("gist_follows").select("followee_id").eq("follower_id", user.id);
  followees = (follows ?? []).map((f) => f.followee_id);

  let q = supabase.from("gist_posts").select("id, author_id, author_name, category, title, body, created_at")
    .eq("moderation_status", "visible").order("created_at", { ascending: false }).limit(50);
  if (cat && GIST_CATEGORIES[cat]) q = q.eq("category", cat);
  if (feed === "following") q = followees.length ? q.in("author_id", followees) : q.eq("author_id", "00000000-0000-0000-0000-000000000000");
  const { data: posts } = await q;
  const ids = (posts ?? []).map((p) => p.id);

  const [{ data: stats }, { data: mine }] = ids.length ? await Promise.all([
    supabase.from("gist_post_stats").select("*").in("post_id", ids),
    supabase.from("gist_reactions").select("post_id, value").eq("profile_id", user.id).in("post_id", ids),
  ]) : [{ data: [] }, { data: [] }];
  const statMap = new Map((stats ?? []).map((s) => [s.post_id, s]));
  const myMap = new Map((mine ?? []).map((r) => [r.post_id, r.value as -1 | 1]));

  const tab = (label: string, href: string, active: boolean) => (
    <Link href={href} className={cn("rounded-full px-3 py-1 text-sm", active ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0]")}>{label}</Link>
  );

  return (
    <div className="animate-fade-in">
      <Header title="Health Gist" subtitle="Experiences, wellness tips, questions, stories and education from the community" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <GistDisclaimer />
        <NewGistPost />
        <nav className="flex flex-wrap gap-2" aria-label="Filter posts">
          {tab("All", "/health-gist", !cat && feed !== "following")}
          {tab("Following", "/health-gist?feed=following", feed === "following")}
          {Object.entries(GIST_CATEGORIES).map(([v, l]) => tab(l, `/health-gist?cat=${v}`, cat === v))}
        </nav>
        {(posts ?? []).length === 0 && <p className="py-12 text-center text-sm text-[#64748B]">No posts yet.</p>}
        {(posts ?? []).map((p) => {
          const s = statMap.get(p.id);
          return (
            <Card key={p.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-[#64748B]">
                <span>{p.author_name ?? "Member"} · {formatRelativeTime(p.created_at)}</span>
                <Badge variant="outline">{GIST_CATEGORIES[p.category]}</Badge>
              </div>
              <Link href={`/health-gist/${p.id}`} className="block">
                <p className="font-semibold text-[#0F172A]">{p.title}</p>
                <p className="text-sm text-[#374151] whitespace-pre-wrap">{truncate(p.body, 400)}</p>
              </Link>
              <GistActions postId={p.id} authorId={p.author_id} myReaction={myMap.get(p.id) ?? 0} up={Number(s?.thumbs_up ?? 0)}
                down={Number(s?.thumbs_down ?? 0)} comments={Number(s?.comments ?? 0)} following={followees.includes(p.author_id)} isSelf={p.author_id === user.id} />
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}
