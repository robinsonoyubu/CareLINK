"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Download, FileText, Copy, Check } from "lucide-react";
import { cvGeneratorSchema, type CvGeneratorInput } from "@/validations";

export default function CvBuilderPage() {
  const [generatedCv, setGeneratedCv] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CvGeneratorInput>({
    resolver: zodResolver(cvGeneratorSchema),
    defaultValues: { template: "standard", skills: [], years_of_experience: 1 },
  });

  const [skillsInput, setSkillsInput] = useState("");

  async function onSubmit(data: CvGeneratorInput) {
    setGeneratedCv("");
    setStreaming(true);

    const skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    data.skills = skills.length > 0 ? skills : ["patient care", "clinical assessment"];

    const res = await fetch("/api/ai/cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      setGeneratedCv("Error generating CV. Please try again.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      setGeneratedCv(result);
    }
    setStreaming(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedCv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="AI CV Builder"
        subtitle="Generate a professional healthcare CV powered by Claude AI"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                CV Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Template</Label>
                  <Tabs defaultValue="standard" onValueChange={(v) => setValue("template", v as "standard" | "international" | "nhs_uk")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="standard" className="flex-1 text-xs">Nigerian Standard</TabsTrigger>
                      <TabsTrigger value="international" className="flex-1 text-xs">International</TabsTrigger>
                      <TabsTrigger value="nhs_uk" className="flex-1 text-xs">NHS UK</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" placeholder="Chidinma Okonkwo" error={errors.full_name?.message} {...register("full_name")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profession">Profession</Label>
                    <Select onValueChange={(v) => setValue("profession", v as CvGeneratorInput["profession"])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="nurse_assistant">Nurse Assistant</SelectItem>
                        <SelectItem value="caregiver">Caregiver</SelectItem>
                        <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty">Specialty (optional)</Label>
                    <Input id="specialty" placeholder="e.g. Paediatric Care" {...register("specialty")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="years_of_experience">Years of Experience</Label>
                    <Input
                      id="years_of_experience"
                      type="number"
                      min={0}
                      max={50}
                      error={errors.years_of_experience?.message}
                      {...register("years_of_experience", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skills">Key Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    placeholder="IV cannulation, wound care, patient assessment..."
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="education">Education</Label>
                  <Input id="education" placeholder="B.Sc. Nursing, UNTH 2018" error={errors.education?.message} {...register("education")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="certifications">Certifications (optional)</Label>
                  <Input id="certifications" placeholder="BNSC, MDCN License No. 12345" {...register("certifications")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="professional_summary">Personal Summary (optional)</Label>
                  <Textarea
                    id="professional_summary"
                    placeholder="Briefly describe your professional background and goals..."
                    rows={3}
                    {...register("professional_summary")}
                  />
                </div>

                <Button type="submit" className="w-full" loading={streaming}>
                  <Sparkles className="h-4 w-4" />
                  {streaming ? "Generating CV..." : "Generate CV with AI"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0F4C81]" />
                  Generated CV
                </CardTitle>
                {generatedCv && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {generatedCv ? (
                <pre className="text-xs text-[#374151] whitespace-pre-wrap font-mono leading-relaxed bg-[#F8FAFC] rounded-lg p-4 min-h-64">
                  {generatedCv}
                  {streaming && <span className="animate-pulse">▋</span>}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-64 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-[#0F4C81]" />
                  </div>
                  <p className="text-sm font-medium text-[#0F172A] mb-1">Your CV will appear here</p>
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
