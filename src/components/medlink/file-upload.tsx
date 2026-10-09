"use client";

import { useRef, useState } from "react";
import { Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads to the private bucket under the user's own folder and returns the
 * storage path. Files are never public; viewers get short-lived signed URLs.
 */
export function FileUpload({ folder, accept = "image/*,application/pdf", label, onUploaded, value }: {
  folder: string; accept?: string; label: string; onUploaded: (path: string) => void; value?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);

  async function handle(file: File) {
    if (file.size > MAX_BYTES) { toast.error("File is larger than 10 MB"); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${user.id}/${folder}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("medlink-private").upload(path, file, { upsert: false });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(file.name);
    onUploaded(path);
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={input} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" /> {label}
      </Button>
      {(name || value) && (
        <span className="flex items-center gap-1 text-xs text-green-700 min-w-0">
          <FileCheck2 className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{name ?? "Uploaded"}</span>
        </span>
      )}
    </div>
  );
}

export function FileLink({ path, label }: { path: string | null | undefined; label: string }) {
  if (!path) return null;
  return (
    <a href={`/api/files/signed?path=${encodeURIComponent(path)}`} target="_blank" rel="noopener noreferrer"
      className="text-sm font-medium text-[#0F4C81] hover:underline">
      {label}
    </a>
  );
}
