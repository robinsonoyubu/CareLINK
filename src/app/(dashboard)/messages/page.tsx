"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Users } from "lucide-react";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
};

type Conversation = {
  id: string;
  name: string | null;
  type: string;
  participant_ids: string[];
  last_message?: string;
  updated_at: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ role: string; full_name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      setUserProfile(profile);

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, name, type, participant_ids, updated_at")
        .contains("participant_ids", [user.id])
        .order("updated_at", { ascending: false });

      setConversations((convs as Conversation[]) ?? []);
    }
    load();
    // supabase client is stable (created once per render cycle outside this effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live updates: subscribe to new messages in the active conversation
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;
          // Skip if already present (e.g. our own optimistic insert)
          let alreadyPresent = false;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) {
              alreadyPresent = true;
              return prev;
            }
            return prev;
          });
          if (alreadyPresent) return;

          let senderName = "Unknown";
          if (incoming.sender_id === currentUserId) {
            senderName = userProfile?.full_name ?? "You";
          } else {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", incoming.sender_id)
              .single();
            senderName = prof?.full_name ?? "Unknown";
          }

          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id)
              ? prev
              : [...prev, { ...incoming, sender_name: senderName }]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id, currentUserId, userProfile?.full_name]);

  async function loadMessages(conv: Conversation) {
    setActiveConv(conv);
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    const msgs = data ?? [];
    const senderIds = [...new Set(msgs.map((m: Message) => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
    setMessages(msgs.map((m: Message) => ({ ...m, sender_name: profileMap[m.sender_id] ?? "Unknown" })));
  }

  function handleConversationCreated(conv: Conversation) {
    setConversations((prev) =>
      prev.some((c) => c.id === conv.id)
        ? prev
        : [conv, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    );
    loadMessages(conv);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !currentUserId) return;
    setSending(true);

    const { data } = await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
    }).select().single();

    if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id)
          ? prev
          : [...prev, { ...data, sender_name: userProfile?.full_name ?? "You" }]
      );
      // Touch the conversation so it re-sorts to the top of the list
      const now = new Date().toISOString();
      await supabase.from("conversations").update({ updated_at: now } as never).eq("id", activeConv.id);
      setConversations((prev) =>
        [...prev]
          .map((c) => (c.id === activeConv.id ? { ...c, updated_at: now } : c))
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    }
    setNewMessage("");
    setSending(false);
  }

  if (userProfile && userProfile.role !== "professional" && userProfile.role !== "admin") {
    return (
      <div className="animate-fade-in">
        <Header title="Workforce Hub" subtitle="Professional messaging network" />
        <div className="flex flex-col items-center py-20 text-center p-6">
          <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-[#0F4C81]" />
          </div>
          <h3 className="text-base font-semibold text-[#0F172A] mb-2">Access Restricted</h3>
          <p className="text-sm text-[#64748B] max-w-sm">
            The Workforce Hub is available to healthcare professionals and administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col h-screen">
      <Header title="Workforce Hub" subtitle="Professional messaging network" />

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="w-72 flex-shrink-0 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-1 mb-1">
            Conversations ({conversations.length})
          </p>
          {currentUserId && (
            <NewConversationDialog currentUserId={currentUserId} onCreated={handleConversationCreated} />
          )}
          {conversations.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-[#CBD5E1] mx-auto mb-2" />
                <p className="text-xs text-[#64748B]">No conversations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    activeConv?.id === conv.id
                      ? "bg-[#EBF4FF] border border-[#0F4C81]/20"
                      : "hover:bg-[#F8FAFC] border border-transparent"
                  )}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(conv.name ?? "GRP")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {conv.name ?? (conv.type === "assignment_team" ? "Assignment Team" : "Group")}
                    </p>
                    <p className="text-xs text-[#94A3B8]">{formatRelativeTime(conv.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          {activeConv ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0]">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getInitials(activeConv.name ?? "GRP")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {activeConv.name ?? "Group Conversation"}
                  </p>
                  <p className="text-xs text-[#64748B]">{activeConv.participant_ids.length} participants</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                        <AvatarFallback className="text-xs">{getInitials(msg.sender_name ?? "?")}</AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-xs lg:max-w-md", isOwn && "items-end flex flex-col")}>
                        <p className="text-xs text-[#94A3B8] mb-1">
                          {isOwn ? "You" : msg.sender_name}
                        </p>
                        <div className={cn(
                          "rounded-2xl px-4 py-2 text-sm",
                          isOwn
                            ? "bg-[#0F4C81] text-white rounded-tr-sm"
                            : "bg-[#F1F5F9] text-[#0F172A] rounded-tl-sm"
                        )}>
                          {msg.content}
                        </div>
                        <p className="text-xs text-[#CBD5E1] mt-1">{formatRelativeTime(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-[#E2E8F0]">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="submit" size="icon" loading={sending} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-[#0F4C81]" />
              </div>
              <h3 className="text-base font-semibold text-[#0F172A] mb-1">Workforce Hub</h3>
              <p className="text-sm text-[#64748B] max-w-xs">
                Select a conversation to start messaging. Professionals can communicate securely here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
