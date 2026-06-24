"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";
import { Plus, Check, Search, Loader2 } from "lucide-react";

type Candidate = { id: string; full_name: string; role: string };

type Conversation = {
  id: string;
  name: string | null;
  type: string;
  participant_ids: string[];
  updated_at: string;
};

interface Props {
  currentUserId: string;
  onCreated: (conv: Conversation) => void;
}

export function NewConversationDialog({ currentUserId, onCreated }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function loadCandidates() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["professional", "admin"])
        .neq("id", currentUserId)
        .order("full_name", { ascending: true });
      setCandidates((data as Candidate[]) ?? []);
      setLoading(false);
    }
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filtered = candidates.filter((c) =>
    c.full_name.toLowerCase().includes(query.toLowerCase())
  );
  const isGroup = selected.length > 1;

  function reset() {
    setSelected([]);
    setGroupName("");
    setQuery("");
    setError(null);
  }

  async function create() {
    if (selected.length === 0) return;
    setCreating(true);
    setError(null);

    const participant_ids = [currentUserId, ...selected];

    // For a 1:1 chat, reuse an existing direct conversation if one already
    // exists with exactly these two participants.
    if (!isGroup) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, name, type, participant_ids, updated_at")
        .eq("type", "direct")
        .contains("participant_ids", participant_ids);

      const match = (existing as Conversation[] | null)?.find(
        (c) => c.participant_ids.length === 2 && participant_ids.every((p) => c.participant_ids.includes(p))
      );
      if (match) {
        setCreating(false);
        setOpen(false);
        reset();
        onCreated(match);
        return;
      }
    }

    const other = candidates.find((c) => c.id === selected[0]);
    const name = isGroup ? groupName.trim() || "Group Conversation" : other?.full_name ?? null;

    const { data, error: insertError } = await supabase
      .from("conversations")
      .insert({
        type: isGroup ? "group" : "direct",
        name,
        participant_ids,
      })
      .select("id, name, type, participant_ids, updated_at")
      .single();

    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not create conversation");
      return;
    }

    setOpen(false);
    reset();
    onCreated(data as Conversation);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <Plus className="h-4 w-4" /> New Conversation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Select one person for a direct chat, or several to start a group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {isGroup && (
            <div className="space-y-1.5">
              <Label htmlFor="group_name">Group name</Label>
              <Input
                id="group_name"
                placeholder="e.g. ICU Night Shift Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-8">No people found</p>
            ) : (
              filtered.map((c) => {
                const isSelected = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors border",
                      isSelected ? "bg-[#EBF4FF] border-[#0F4C81]/30" : "hover:bg-[#F8FAFC] border-transparent"
                    )}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{c.full_name}</p>
                      <p className="text-xs text-[#94A3B8] capitalize">{c.role}</p>
                    </div>
                    <div className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 border",
                      isSelected ? "bg-[#0F4C81] border-[#0F4C81]" : "border-[#CBD5E1]"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <p className="text-xs text-[#64748B] mr-auto self-center">
            {selected.length === 0 ? "No one selected" : `${selected.length} selected`}
          </p>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} loading={creating} disabled={selected.length === 0}>
            {isGroup ? "Create Group" : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
