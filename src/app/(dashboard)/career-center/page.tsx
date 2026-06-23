"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText, Copy, Check, Mail, ClipboardList, MessagesSquare, Compass, Award } from "lucide-react";

type DocType = "cover_letter" | "nhs_statement" | "interview_prep" | "career_guidance" | "recommendation_letter";

const DOC_TYPES: { id: DocType; label: string; icon: typeof Mail; hint: string; placeholder: string }[] = [
  { id: "cover_letter", label: "Cover Letter", icon: Mail, hint: "Tailored to a specific role", placeholder: "Paste the job/role description you're applying for…" },
  { id: "nhs_statement", label: "NHS Statement", icon: ClipboardList, hint: "NHS supporting statement", placeholder: "Paste the NHS job spec / person specification…" },
  { id: "interview_prep", label: "Interview Prep", icon: MessagesSquare, hint: "Questions & model answers", placeholder: "Describe the role and interview type (e.g. ward nurse, panel interview)…" },
  { id: "career_guidance", label: "Career Guidance", icon: Compass, hint: "Personalised roadmap", placeholder: "Describe your current role and where you want your career to go…" },
  { id: "recommendation_letter", label: "Recommendation", icon: Award, hint: "Reference letter", placeholder: "Supervisor name & title, relationship, and key strengths to highlight…" },
];

export default function CareerCenterPage() {
  const [docType, setDocType] = useState<DocType>("cover_letter");
  const [form, setForm] = useState({ full_name: "", profession: "", specialty: "", years_of_experience: "", details: "" });
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = DOC_TYPES.find((d) => d.id === docType)!;

  async function generate() {
    if (!form.full_name || !form.profession || !form.details) {
      setOutput("Please fill in your name, profession, and the details field.");
      return;
    }
    setOutput("");
    setStreaming(true);

    const res = await fetch("/api/ai/career-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_type: docType,
        full_name: form.full_name,
        profession: form.profession,
        specialty: form.specialty || undefined,
        years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : undefined,
        details: form.details,
      }),
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      setOutput("Error generating document. Please try again.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      setOutput(result);
    }
    setStreaming(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-fade-in">
      <Header title="AI Career Center" subtitle="Cover letters, NHS statements, interview prep & more — powered by Claude AI" />

      <div className="p-6 space-y-6">
        {/* Document type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DOC_TYPES.map((d) => {
            const Icon = d.icon;
            const selected = d.id === docType;
            return (
              <button
                key={d.id}
                onClick={() => { setDocType(d.id); setOutput(""); }}
                className={`rounded-xl border p-4 text-left transition-all ${selected ? "border-[#0F4C81] bg-[#EBF4FF] shadow-sm" : "border-[#E2E8F0] hover:border-[#0F4C81]/40 bg-white"}`}
              >
                <Icon className={`h-5 w-5 mb-2 ${selected ? "text-[#0F4C81]" : "text-[#94A3B8]"}`} />
                <p className="text-sm font-semibold text-[#0F172A]">{d.label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{d.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                {active.label} Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" placeholder="Chidinma Okonkwo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profession</Label>
                  <Input id="profession" placeholder="e.g. Registered Nurse" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">Specialty (optional)</Label>
                  <Input id="specialty" placeholder="e.g. Paediatric Care" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="years">Years of Experience</Label>
                  <Input id="years" type="number" min={0} max={50} placeholder="5" value={form.years_of_experience} onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="details">Details</Label>
                <Textarea id="details" rows={7} placeholder={active.placeholder} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
              </div>

              <Button className="w-full" loading={streaming} onClick={generate}>
                <Sparkles className="h-4 w-4" />
                {streaming ? `Generating ${active.label}…` : `Generate ${active.label}`}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0F4C81]" />
                  Generated {active.label}
                </CardTitle>
                {output && !streaming && (
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {output ? (
                <pre className="text-xs text-[#374151] whitespace-pre-wrap font-mono leading-relaxed bg-[#F8FAFC] rounded-lg p-4 min-h-64">
                  {output}
                  {streaming && <span className="animate-pulse">▋</span>}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-64 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-[#0F4C81]" />
                  </div>
                  <p className="text-sm font-medium text-[#0F172A] mb-1">Your {active.label.toLowerCase()} will appear here</p>
                  <p className="text-xs text-[#64748B]">Fill in the form and click Generate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
