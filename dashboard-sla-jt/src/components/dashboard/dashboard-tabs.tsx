"use client";

import { CalendarDays, CalendarRange, LayoutDashboard } from "lucide-react";

import { DetailedView } from "@/components/dashboard/detailed-view";
import { SemanalView } from "@/components/dashboard/semanal-view";
import { useDashboardTab, type TabId } from "@/components/dashboard/tab-context";
import { WeeklyView } from "@/components/dashboard/weekly-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const triggerClass =
  "gap-2 rounded-lg px-4 py-2 text-sm transition-colors data-active:!bg-brand data-active:!text-brand-foreground data-active:!shadow-sm";

export function DashboardTabs() {
  const { active, setActive } = useDashboardTab();

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(value as TabId)}
      className="w-full gap-6"
    >
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm sm:w-auto">
        <TabsTrigger value="detalhado" className={triggerClass}>
          <LayoutDashboard className="size-4" />
          SLA Detalhado
        </TabsTrigger>
        <TabsTrigger value="geral" className={triggerClass}>
          <CalendarRange className="size-4" />
          Base Geral (semanal)
        </TabsTrigger>
        <TabsTrigger value="semanal" className={triggerClass}>
          <CalendarDays className="size-4" />
          SLA Semanal (diário)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detalhado" className="mt-0 focus-visible:outline-none">
        <DetailedView />
      </TabsContent>
      <TabsContent value="geral" className="mt-0 focus-visible:outline-none">
        <WeeklyView />
      </TabsContent>
      <TabsContent value="semanal" className="mt-0 focus-visible:outline-none">
        <SemanalView />
      </TabsContent>
    </Tabs>
  );
}
