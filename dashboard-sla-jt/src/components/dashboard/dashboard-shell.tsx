"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Box,
  CalendarRange,
  ChevronRight,
  Download,
  ExternalLink,
  type LucideIcon,
  Menu,
  RefreshCw,
  Settings,
  Truck,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  DASHBOARD_TABS,
  DashboardTabsProvider,
  useDashboardTab,
  type TabId,
} from "@/components/dashboard/tab-context";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics";
import { exportTab } from "@/lib/export";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <Box className="size-8 text-frenet-cyan" strokeWidth={1.75} />
      <div className="leading-tight">
        <p className="text-base font-semibold lowercase tracking-tight">frenet</p>
        <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Logistics Intelligence
        </p>
      </div>
    </div>
  );
}

const DIAGNOSTIC_ITEMS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "analises", label: "Análises", icon: BarChart3 },
  { key: "alertas", label: "Alertas", icon: AlertTriangle },
];

function StaticNavItem({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function NavList({
  onNavigate,
  onOpenSettings,
}: {
  onNavigate?: () => void;
  onOpenSettings: () => void;
}) {
  const { active, setActive } = useDashboardTab();

  function handle(id: TabId) {
    setActive(id);
    onNavigate?.();
  }

  function handleExport() {
    exportTab(active);
    onNavigate?.();
  }

  function handleSettings() {
    onOpenSettings();
    onNavigate?.();
  }

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
      <div className="space-y-1">
        {DASHBOARD_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handle(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--frenet-blue)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-frenet-blue" : "text-muted-foreground",
                )}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    "truncate text-[0.68rem] font-normal",
                    isActive ? "text-frenet-blue/80" : "text-muted-foreground",
                  )}
                >
                  {tab.sheet}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className="px-3 pb-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Diagnóstico
        </p>
        {DIAGNOSTIC_ITEMS.map((item) => (
          <StaticNavItem key={item.key} label={item.label} icon={item.icon} />
        ))}
      </div>

      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-4">
        <StaticNavItem label="Exportar" icon={Download} onClick={handleExport} />
        <StaticNavItem label="Configurações" icon={Settings} onClick={handleSettings} />
      </div>
    </nav>
  );
}

function ProfileCard() {
  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-frenet-indigo text-sm font-semibold text-white">
        AL
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-sidebar-foreground">Analista de Logística</p>
        <p className="truncate text-xs text-muted-foreground">operacoes@frenet.com</p>
      </div>
      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
    </div>
  );
}

function SettingsDialog({
  open,
  onClose,
  carrier,
  rangeLabel,
  updatedAt,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  carrier: string;
  rangeLabel: string;
  updatedAt: string;
  onExport: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { meta } = analytics;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Settings className="size-4" />
            </span>
            <div className="leading-tight">
              <h2 className="text-base font-semibold tracking-tight">Configurações</h2>
              <p className="text-xs text-muted-foreground">Preferências do painel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">Claro, escuro ou do sistema</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-border pt-4">
            <p className="font-medium">Exportar dados</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Baixe os dados da aba ativa em CSV (Excel).
            </p>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:opacity-90"
            >
              <Download className="size-4" />
              Exportar aba atual
            </button>
          </div>

          <dl className="space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Transportadora</dt>
              <dd className="font-medium text-foreground">{carrier}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Período</dt>
              <dd className="font-medium text-foreground">{rangeLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Última atualização</dt>
              <dd className="font-medium text-foreground">{updatedAt}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Fonte de dados</dt>
              <dd>
                <a
                  href={meta.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
                >
                  Google Sheets
                  <ExternalLink className="size-3" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  carrier: string;
  rangeLabel: string;
  updatedAt: string;
  children: ReactNode;
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardTabsProvider>
      <ShellLayout {...props} />
    </DashboardTabsProvider>
  );
}

function ShellLayout({ carrier, rangeLabel, updatedAt, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { active } = useDashboardTab();

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <NavList onOpenSettings={openSettings} />
        <ProfileCard />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent"
                aria-label="Fechar menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavList
              onNavigate={() => setMobileOpen(false)}
              onOpenSettings={openSettings}
            />
            <ProfileCard />
          </aside>
        </div>
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        carrier={carrier}
        rangeLabel={rangeLabel}
        updatedAt={updatedAt}
        onExport={() => exportTab(active)}
      />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-4" />
            </button>

            <div className="min-w-0">
              <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                SLA de entregas
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                Painel de performance logística
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Badge
                variant="outline"
                className="hidden items-center gap-1.5 border-brand/30 bg-brand/10 font-medium text-brand sm:inline-flex"
              >
                <Truck className="size-3.5" />
                {carrier}
              </Badge>
              <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm md:flex">
                <CalendarRange className="size-3.5 text-brand" />
                <span className="font-medium text-foreground">{rangeLabel}</span>
              </div>
              <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm xl:flex">
                <RefreshCw className="size-3.5 text-positive" />
                <span>Atualizado {updatedAt}</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
