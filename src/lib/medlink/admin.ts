import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Server-component guard for RGH-only pages. */
export async function requireRghAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");
  return { supabase, user };
}
