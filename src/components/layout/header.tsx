"use client";

import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface HeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
  notificationCount?: number;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, onMobileMenuToggle, notificationCount = 0, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[#E2E8F0] bg-white px-6">
      {onMobileMenuToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-[#0F172A] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
      </div>

      <div className="hidden md:flex items-center w-72">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5 text-[#64748B]" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
