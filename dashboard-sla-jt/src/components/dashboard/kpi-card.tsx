import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent =
  | "brand"
  | "positive"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "neutral";

const accentBar: Record<Accent, string> = {
  brand: "bg-brand",
  positive: "bg-positive",
  info: "bg-info",
  success: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-neutral-soft",
  neutral: "bg-brand",
};

const accentChip: Record<Accent, string> = {
  brand: "bg-brand/10 text-brand",
  positive: "bg-positive/10 text-positive",
  info: "bg-info/10 text-info",
  success: "bg-positive/10 text-positive",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-muted-foreground",
  neutral: "bg-brand/10 text-brand",
};

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
  icon?: ReactNode;
}

export function KpiCard({ label, value, hint, accent = "neutral", icon }: KpiCardProps) {
  return (
    <Card className="group relative overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span
        className={cn("absolute inset-y-0 left-0 w-1 opacity-80", accentBar[accent])}
        aria-hidden
      />
      <CardContent className="flex flex-col gap-2.5 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon && (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                accentChip[accent],
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
