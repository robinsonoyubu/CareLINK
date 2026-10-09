"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, Flag, UserPlus, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export const GIST_CATEGORIES: Record<string, string> = {
  experience: "Health experience", wellness_tip: "Wellness tip", question: "Question", story: "Story", education: "Education",
};

export function NewGistPost() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("experience");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gist_posts").insert({ author_id: user?.id, category, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false); setTitle(""); setBody("");
    router.refresh();
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Share something</Button>;
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="flex h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
          {Object.entries(GIST_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} aria-label="Title" />
      </div>
      <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} aria-label="Post"
        placeholder="Share your experience, a tip, a question or a story. Don't post other people's private details."
        className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button loading={busy} disabled={title.trim().length < 3 || body.trim().length < 5} onClick={post}>Post</Button>
      </div>
    </CardContent></Card>
  );
}

export function GistActions({ postId, authorId, myReaction, up, down, comments, following, isSelf }: {
  postId: string; authorId: string; myReaction: -1 | 0 | 1; up: number; down: number; comments: number; following: boolean; isSelf: boolean;
}) {
  const [reaction, setReaction] = useState(myReaction);
  const [counts, setCounts] = useState({ up, down });
  const [follow, setFollow] = useState(following);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("misinformation");
  const [details, setDetails] = useState("");

  async function react(value: -1 | 1) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = reaction === value ? 0 : value;
    const delta = { up: (next === 1 ? 1 : 0) - (reaction === 1 ? 1 : 0), down: (next === -1 ? 1 : 0) - (reaction === -1 ? 1 : 0) };
    setReaction(next); setCounts((c) => ({ up: c.up + delta.up, down: c.down + delta.down }));
    const { error } = next === 0
      ? await supabase.from("gist_reactions").delete().eq("post_id", postId).eq("profile_id", user.id)
      : await supabase.from("gist_reactions").upsert({ post_id: postId, profile_id: user.id, value: next });
    if (error) toast.error("Couldn't save your reaction");
  }

  async function toggleFollow() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = follow
      ? await supabase.from("gist_follows").delete().eq("follower_id", user.id).eq("followee_id", authorId)
      : await supabase.from("gist_follows").insert({ follower_id: user.id, followee_id: authorId });
    if (!error) setFollow(!follow);
  }

  async function share() {
    const url = `${window.location.origin}/health-gist/${postId}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "Health Gist on MedLINK" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  }

  async function report() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gist_reports").insert({ post_id: postId, reporter_id: user?.id, reason, details: details.trim() || null });
    if (error) { toast.error(error.message); return; }
    setReporting(false);
    toast.success("Reported to RGH moderators");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <Button size="sm" variant="ghost" aria-pressed={reaction === 1} onClick={() => react(1)} className={cn(reaction === 1 && "text-[#0F4C81]")}><ThumbsUp className="h-4 w-4" />{counts.up}</Button>
        <Button size="sm" variant="ghost" aria-pressed={reaction === -1} onClick={() => react(-1)} className={cn(reaction === -1 && "text-red-600")}><ThumbsDown className="h-4 w-4" />{counts.down}</Button>
        <Link href={`/health-gist/${postId}`}><Button size="sm" variant="ghost"><MessageCircle className="h-4 w-4" />{comments}</Button></Link>
        <Button size="sm" variant="ghost" onClick={share}><Share2 className="h-4 w-4" />Share</Button>
        {!isSelf && <Button size="sm" variant="ghost" onClick={toggleFollow}>{follow ? <><UserCheck className="h-4 w-4" />Following</> : <><UserPlus className="h-4 w-4" />Follow</>}</Button>}
        {!isSelf && <Button size="sm" variant="ghost" onClick={() => setReporting(!reporting)}><Flag className="h-4 w-4" />Report</Button>}
      </div>
      {reporting && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1">
            <Label htmlFor={`rr-${postId}`}>Reason</Label>
            <select id={`rr-${postId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="flex h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
              <option value="misinformation">Dangerous misinformation</option><option value="harassment">Harassment</option>
              <option value="scam">Scam</option><option value="privacy">Privacy violation</option><option value="other">Other</option>
            </select>
          </div>
          <Input placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} className="flex-1" aria-label="Report details" />
          <Button size="sm" onClick={report}>Submit report</Button>
        </div>
      )}
    </div>
  );
}

export function GistCommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gist_comments").insert({ post_id: postId, author_id: user?.id, body: body.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <Input placeholder="Write a comment" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} aria-label="Comment" />
      <Button loading={busy} disabled={!body.trim()} onClick={send}>Comment</Button>
    </div>
  );
}

export function GistDisclaimer() {
  return (
    <p role="note" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
      Community posts are not medically verified. Don&apos;t rely on them for diagnosis or treatment — speak to a professional. In an emergency, use Ambulance & Paramedics.
    </p>
  );
}
