import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ProviderConsole } from "@/components/medlink/provider-console";
import { RghVerifiedBadge } from "@/components/medlink/badges";
import { cn } from "@/lib/utils";

export const metadata = { title: "Provider Portal" };

export default async function ProviderPortalPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase.from("provider_members").select("provider_id").eq("profile_id", user.id);
  const ids = (memberships ?? []).map((m) => m.provider_id);
  if (ids.length === 0) {
    return (
      <div className="animate-fade-in">
        <Header title="Provider Portal" />
        <p className="p-6 text-sm text-[#64748B]">Your account isn&apos;t linked to a hospital, diagnostic centre, pharmacy or ambulance partner yet. RGH links verified providers to staff accounts — contact RGH to be onboarded.</p>
      </div>
    );
  }
  const { data: providers } = await supabase.from("service_providers").select("*").in("id", ids).order("name");
  const list = providers ?? [];
  const current = list.find((x) => x.id === p) ?? list[0];

  return (
    <div className="animate-fade-in">
      <Header title={current.name} subtitle={`Provider Portal · ${current.kind}`} actions={current.is_verified ? <RghVerifiedBadge /> : undefined} />
      <div className="p-4 md:p-6 space-y-4">
        {list.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {list.map((x) => <Link key={x.id} href={`/provider?p=${x.id}`} className={cn("rounded-full px-3 py-1 text-sm", x.id === current.id ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0]")}>{x.name}</Link>)}
          </nav>
        )}
        <ProviderConsole key={current.id} provider={current as never} />
      </div>
    </div>
  );
}
