"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarClock,
  LayoutGrid,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export type TabId = "detalhado" | "geral" | "semanal";

export interface TabMeta {
  id: TabId;
  /** Menu/sidebar label — mirrors the source sheet being analysed. */
  label: string;
  /** Short descriptor of the granularity. */
  hint: string;
  /** Underlying spreadsheet tab this view is built from. */
  sheet: string;
  icon: LucideIcon;
}

export const DASHBOARD_TABS: TabMeta[] = [
  {
    id: "detalhado",
    label: "SLA por Data/Hora",
    hint: "Detalhado",
    sheet: "Base SLA J&T",
    icon: LayoutGrid,
  },
  {
    id: "geral",
    label: "Visão Geral",
    hint: "Semanal",
    sheet: "Base Geral",
    icon: LineChart,
  },
  {
    id: "semanal",
    label: "SLA Diário Oficial",
    hint: "Diário",
    sheet: "Base_sla_semanal",
    icon: CalendarClock,
  },
];

interface TabContextValue {
  active: TabId;
  setActive: (id: TabId) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function DashboardTabsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TabId>("detalhado");
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useDashboardTab(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) {
    throw new Error("useDashboardTab must be used within DashboardTabsProvider");
  }
  return ctx;
}
