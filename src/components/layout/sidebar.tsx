"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Hospital, FlaskConical, Pill, Ambulance, Coins, Newspaper, CalendarCheck, MessageSquare, Bell, UserCircle,
  LogOut, ChevronLeft, ChevronRight, Bot, Scale, Fingerprint, Briefcase, Calendar, ClipboardList, Sparkles,
  QrCode, Store, Users, UserCheck, Building2, Shield, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, getInitials, humanizeRole } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRIMARY_NAV, workspaceNavFor, type WorkspaceNavKey } from "@/lib/medlink/navigation";
import type { UserRole } from "@/types";
import { useState } from "react";

interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onSignOut: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const PRIMARY_ICONS: Record<(typeof PRIMARY_NAV)[number]["key"], LucideIcon> = {
  home: Home,
  hospitals: Hospital,
  diagnostics: FlaskConical,
  pharmacy: Pill,
  ambulance: Ambulance,
  earn: Coins,
  gist: Newspaper,
  bookings: CalendarCheck,
  chats: MessageSquare,
  notifications: Bell,
  profile: UserCircle,
};

const WORKSPACE_ICONS: Record<WorkspaceNavKey, LucideIcon> = {
  assistant: Bot,
  disputes: Scale,
  attendance: Fingerprint,
  facility_attendance: QrCode,
  assignments: Briefcase,
  scheduling: Calendar,
  performance: ClipboardList,
  career: Sparkles,
  staff_requests: ClipboardList,
  provider_portal: Store,
  workforce: Users,
  professionals: UserCheck,
  organizations: Building2,
  rgh_ops: Shield,
};

function NavLink({ href, label, icon: Icon, collapsed, active, onClick }: {
  href: string; label: string; icon: LucideIcon; collapsed: boolean; active: boolean; onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          active ? "bg-white text-[#0F4C81]" : "text-white/80 hover:bg-white/10 hover:text-white"
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
}

export function Sidebar({ role, userName, userEmail, avatarUrl, onSignOut, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedDesktop, setCollapsed] = useState(false);
  // The mobile drawer is always full width.
  const collapsed = collapsedDesktop && !mobileOpen;
  const workspace = workspaceNavFor(role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/attendance") return pathname === "/attendance";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onMobileClose} aria-hidden />}
      <aside
        className={cn(
          "flex flex-col bg-[#0F4C81] text-white transition-all duration-300 h-screen",
          "fixed inset-y-0 left-0 z-50 w-72 md:sticky md:top-0 md:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-64"
        )}
        aria-label="Main navigation"
      >
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/10", collapsed && "justify-center px-2")}>
          <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#0F4C81] font-bold text-sm">M</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight">MedLINK</p>
              <p className="text-xs text-white/60 leading-tight">by RGH</p>
            </div>
          )}
          {mobileOpen && (
            <button onClick={onMobileClose} className="md:hidden p-1.5 rounded-md hover:bg-white/10" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsedDesktop)}
          className="hidden md:flex absolute -right-3 top-16 z-10 h-6 w-6 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F4C81] shadow-sm hover:shadow-md transition-shadow"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={PRIMARY_ICONS[item.key]}
                collapsed={collapsed} active={isActive(item.href)} onClick={onMobileClose} />
            ))}
          </ul>
          {workspace.length > 0 && (
            <>
              {!collapsed && <p className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">Workspace</p>}
              {collapsed && <div className="my-3 border-t border-white/10" />}
              <ul className="space-y-0.5">
                {workspace.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={WORKSPACE_ICONS[item.key]}
                    collapsed={collapsed} active={isActive(item.href)} onClick={onMobileClose} />
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-white/20 text-white text-xs">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-white/60 truncate">{humanizeRole(role)} · {userEmail}</p>
              </div>
              <button onClick={onSignOut} className="flex-shrink-0 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={onSignOut} className="w-full flex justify-center p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
