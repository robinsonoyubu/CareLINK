import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { ModerationActions } from "@/components/admin/admin-actions";
import { requireRghAdmin } from "@/lib/medlink/admin";
import { formatDateTime, truncate } from "@/lib/utils";

export const metadata = { title: "Health Gist moderation" };

export default async function ModerationPage() {
  const { supabase } = await requireRghAdmin();
  const { data } = await supabase.from("gist_reports")
    .select("id, reason, details, created_at, post_id, post:gist_posts(id, title, body, author_name, moderation_status)")
    .eq("status", "open").order("created_at");
  const rows = (data ?? []) as unknown as { id: string; reason: string; details: string | null; created_at: string; post_id: string | null; post: { id: string; title: string; body: string; author_name: string | null; moderation_status: string } | null }[];

  return (
    <div className="animate-fade-in">
      <Header title="Health Gist moderation" subtitle="Dangerous misinformation, harassment, scams and privacy violations" />
      <div className="p-4 md:p-6 space-y-3 max-w-3xl">
        {rows.length === 0 && <p className="py-10 text-center text-sm text-[#64748B]">No open reports.</p>}
        {rows.map((r) => (
          <Card key={r.id}><CardContent className="p-4 space-y-2 text-sm">
            <p className="text-xs text-[#64748B]">{r.reason} · reported {formatDateTime(r.created_at)}{r.details ? ` · “${r.details}”` : ""}</p>
            {r.post && (
              <Link href={`/health-gist/${r.post.id}`} className="block rounded-md bg-[#F8FAFC] p-3">
                <p className="font-medium">{r.post.title} <span className="text-xs text-[#64748B]">by {r.post.author_name ?? "member"} · {r.post.moderation_status}</span></p>
                <p className="text-[#374151]">{truncate(r.post.body, 300)}</p>
              </Link>
            )}
            <ModerationActions reportId={r.id} postId={r.post_id} />
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
