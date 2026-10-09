"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Siren } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I need a malaria test near Ikeja",
  "Find a hospital with paediatrics",
  "I need a nurse at home for my mum after surgery",
  "What's the status of my bookings?",
];

/** Turn app paths like /hospitals/<id> in replies into links. */
function renderText(text: string) {
  const parts = text.split(/(\/(?:hospitals|diagnostics|pharmacy|ambulance|bookings|earn|health-gist|chats|profile)(?:\/[\w-]+)?(?:\?[\w=&-]+)?)/g);
  return parts.map((p, i) => i % 2 === 1 ? <Link key={i} href={p} className="text-[#0F4C81] underline break-all">{p}</Link> : <span key={i}>{p}</span>);
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text: string) {
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20) }) });
      const data = (await res.json()) as { reply?: string; error?: unknown };
      setMessages([...next, { role: "assistant", content: data.reply ?? (typeof data.error === "string" ? data.error : "Something went wrong. Please try again.") }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "I couldn't connect. Please try again." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-44px)] md:h-screen">
      <Header title="AI Health Assistant" subtitle="General health information and help finding & booking care" />
      <div className="flex items-center gap-2 bg-red-50 px-4 py-2 text-xs text-red-800 md:px-6">
        <Siren className="h-3.5 w-3.5 flex-shrink-0" />
        Not for emergencies or diagnosis. In an emergency use <Link href="/ambulance" className="font-semibold underline">Emergency</Link> or call 112.
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {messages.length === 0 && (
          <div className="max-w-xl space-y-3">
            <p className="flex items-center gap-2 font-medium"><Bot className="h-5 w-5 text-[#0F4C81]" />How can I help today?</p>
            <p className="text-sm text-[#64748B]">I can explain health topics in general terms and help you find hospitals, tests, medicines, ambulances and verified professionals. I can&apos;t diagnose, prescribe prescription medicines or replace emergency care.</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm hover:border-[#0F4C81]/40">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
            <div className={cn("max-w-[85%] md:max-w-xl rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
              m.role === "user" ? "bg-[#0F4C81] text-white rounded-tr-sm" : "bg-white border border-[#E2E8F0] rounded-tl-sm")}>
              {m.role === "assistant" ? renderText(m.content) : m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-[#64748B]" aria-live="polite">Thinking…</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !busy) send(input); }} className="flex gap-2 border-t border-[#E2E8F0] bg-white p-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about symptoms, services or your bookings…" aria-label="Message" maxLength={2000} />
        <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
