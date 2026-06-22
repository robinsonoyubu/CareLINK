"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Heart, Calendar, UserCheck,
  BarChart3, MessageSquare, Settings, LogOut, ClipboardList,
  Activity, Shield, Briefcase, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { UserRole } from "@/types";
import { useState } from "react";

interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onSignOut: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "professional", "organization", "client"] },
  { label: "Workforce", href: "/workforce", icon: Users, roles: ["admin"] },
  { label: "Professionals", href: "/professionals", icon: UserCheck, roles: ["admin"] },
  { label: "Organizations", href: "/organizations", icon: Building2, roles: ["admin"] },
  { label: "Clients", href: "/clients", icon: Heart, roles: ["admin"] },
  { label: "Assignments", href: "/assignments", icon: Briefcase, roles: ["admin", "professional"] },
  { label: "Scheduling", href: "/scheduling", icon: Calendar, roles: ["admin", "professional"] },
  { label: "Performance", href: "/performance", icon: ClipboardList, roles: ["admin", "professional"] },
  { label: "Messages", href: "/messages", icon: MessageSquare, roles: ["admin", "professional"] },
  { label: "My Profile", href: "/professionals/me", icon: UserCheck, roles: ["professional"] },
  { label: "My Cases", href: "/clients/cases", icon: Activity, roles: ["client"] },
  { label: "Bookings", href: "/clients/bookings", icon: Calendar, roles: ["client", "organization"] },
  { label: "Staff Requests", href: "/organizations/requests", icon: ClipboardList, roles: ["organization"] },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["admin"] },
  { label: "Admin", href: "/admin", icon: Shield, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin", "professional", "organization", "client"] },
];

export function Sidebar({ role, userName, userEmail, avatarUrl, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-[#E2E8F0] bg-[#0F4C81] text-white transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/10", collapsed && "justify-center px-2")}>
        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-[#0F4C81] font-bold text-sm">cL</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">careLINK</p>
            <p className="text-xs text-white/60 leading-tight">by RAFFATI</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F4C81] shadow-sm hover:shadow-md transition-shadow"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "",
                    isActive
                      ? "bg-white text-[#0F4C81]"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-white/20 text-white text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-white/60 truncate">{userEmail}</p>
            </div>
            <button
              onClick={onSignOut}
              className="flex-shrink-0 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignOut}
            className="w-full flex justify-center p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
