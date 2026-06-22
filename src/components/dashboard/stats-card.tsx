import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  description?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-[#0F4C81]",
  iconBg = "bg-[#EBF4FF]",
  description,
}: StatsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-[#64748B]">{title}</p>
            <p className="mt-2 text-3xl font-bold text-[#0F172A]">{value}</p>
            {change && (
              <p className={cn(
                "mt-1 text-xs font-medium",
                changeType === "positive" && "text-[#22C55E]",
                changeType === "negative" && "text-red-500",
                changeType === "neutral" && "text-[#64748B]",
              )}>
                {change}
              </p>
            )}
            {description && <p className="mt-1 text-xs text-[#94A3B8]">{description}</p>}
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
