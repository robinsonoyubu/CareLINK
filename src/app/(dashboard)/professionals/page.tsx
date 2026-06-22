import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, Star } from "lucide-react";
import Link from "next/link";
import { getInitials, humanizeProfession, humanizeStatus, generateAvatarUrl } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Professionals" };

export default async function ProfessionalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      id, profession, specialty, years_of_experience, workforce_status,
      rating, total_assignments, is_verified,
      profiles!inner(id, full_name, email, avatar_url, phone)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-in">
      <Header
        title="Healthcare Professionals"
        subtitle="Manage and monitor your workforce"
        actions={
          <Link href="/professionals/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4" />
              Add Professional
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Available", "Assigned", "On Leave", "Under Review"].map((f) => (
            <button
              key={f}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#E2E8F0] text-[#64748B] hover:border-[#0F4C81] hover:text-[#0F4C81] transition-colors first:bg-[#0F4C81] first:text-white first:border-[#0F4C81]"
            >
              {f}
            </button>
          ))}
        </div>

        {professionals && professionals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {professionals.map((pro) => {
              const profile = Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles;
              const status = pro.workforce_status as string;
              return (
                <Link key={pro.id} href={`/professionals/${pro.id}`}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={profile?.avatar_url ?? generateAvatarUrl(profile?.full_name ?? "")} alt={profile?.full_name} />
                          <AvatarFallback>{getInitials(profile?.full_name ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              {profile?.full_name}
                            </p>
                            {pro.is_verified && (
                              <span className="flex-shrink-0 text-[#0F4C81]" title="Verified">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B]">{humanizeProfession(pro.profession)}</p>
                          {pro.specialty && <p className="text-xs text-[#94A3B8]">{pro.specialty}</p>}
                        </div>
                        <Badge variant={status.replace(" ", "_") as "available" | "assigned" | "on_leave" | "under_review" | "suspended"} className="flex-shrink-0 text-xs">
                          {humanizeStatus(status)}
                        </Badge>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-[#64748B]">
                        <span>{pro.years_of_experience} yrs exp</span>
                        {pro.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                            <span className="font-medium">{pro.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <span>{pro.total_assignments} assignments</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No professionals yet</h3>
            <p className="text-sm text-[#64748B] mb-4">Add your first healthcare professional to get started.</p>
            <Link href="/professionals/new">
              <Button>
                <UserPlus className="h-4 w-4" />
                Add Professional
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
