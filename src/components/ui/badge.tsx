import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#0F4C81] text-white",
        secondary: "bg-[#22C55E]/10 text-[#16a34a]",
        accent: "bg-[#F59E0B]/10 text-[#d97706]",
        destructive: "bg-red-100 text-red-700",
        outline: "border border-[#E2E8F0] text-[#374151]",
        available: "bg-green-100 text-green-700",
        assigned: "bg-blue-100 text-blue-700",
        on_leave: "bg-yellow-100 text-yellow-700",
        under_review: "bg-orange-100 text-orange-700",
        resigned: "bg-gray-100 text-gray-600",
        contract_completed: "bg-purple-100 text-purple-700",
        suspended: "bg-red-100 text-red-700",
        pending: "bg-yellow-100 text-yellow-700",
        active: "bg-green-100 text-green-700",
        completed: "bg-blue-100 text-blue-700",
        cancelled: "bg-gray-100 text-gray-600",
        verified: "bg-green-100 text-green-700",
        unverified: "bg-orange-100 text-orange-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
