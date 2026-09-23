import raw from "@/data/analytics.json";

export type Tone = "positive" | "info" | "warning" | "danger" | "neutral";

export interface StatusSlice {
  key: string;
  label: string;
  count: number;
  pct: number | null;
  tone: Tone;
}

export interface DayPoint {
  date: string;
  label: string;
  labelLong: string;
  volume: number;
  scored: number;
  slaAvg: number | null;
}

export interface HourPoint {
  hour: number;
  label: string;
  volume: number;
  scored: number;
  slaAvg: number | null;
}

export interface SeriesPoint {
  ts: string;
  label: string;
  shortLabel: string;
  day: string;
  volume: number;
  scored: number;
  slaAvg: number | null;
}

export interface WeekPoint {
  weekStart: string;
  label: string;
  shortLabel: string;
  slaAvg: number;
}

export interface BaseGeral {
  metric: string;
  weeks: WeekPoint[];
  total: number | null;
  best: WeekPoint | null;
  worst: WeekPoint | null;
}

export interface SemanalDay {
  date: string;
  label: string;
  weekday: string;
  numSemana: number | null;
  slaAvg: number;
}

export interface SemanalWeek {
  numSemana: number;
  label: string;
  slaAvg: number;
  days: number;
  range: string;
}

export interface BaseSlaSemanal {
  metric: string;
  days: SemanalDay[];
  weeks: SemanalWeek[];
  best: SemanalDay | null;
  worst: SemanalDay | null;
  latest: SemanalDay | null;
  overall: number | null;
}

export interface Analytics {
  meta: {
    generatedAt: string;
    sourceFile: string;
    sheet: string;
    carrier: string;
    origin: string;
    sheetUrl: string;
    dateRange: { start: string | null; end: string | null };
  };
  kpis: {
    slaAvg: number;
    totalDeliveries: number;
    scored: number;
    onTime: number;
    late: number;
    partial: number;
    noInfo: number;
  };
  statusDistribution: StatusSlice[];
  byDay: DayPoint[];
  byHourOfDay: HourPoint[];
  timeSeries: SeriesPoint[];
  highlights: {
    bestDay: DayPoint | null;
    worstDay: DayPoint | null;
    worstBuckets: SeriesPoint[];
  };
  baseGeral: BaseGeral;
  baseSlaSemanal: BaseSlaSemanal;
}

export const analytics = raw as unknown as Analytics;

/**
 * Authoritative overall SLA rate.
 *
 * The detailed tab's raw rows only cover 16–21/09, so their simple average
 * diverges from the consolidated figure Delfos reports (the "Base Geral" tab
 * also includes 14–15/09, which the raw sample does not). We therefore treat
 * the Base Geral total as the source of truth for the headline SLA, falling
 * back to the raw mean only if the summary is unavailable.
 */
export const overallSla: number =
  analytics.baseGeral.total ?? analytics.kpis.slaAvg;

/** Average SLA across the hours of the day (mean of the hourly rates). */
export const avgHourlySla: number = (() => {
  const values = analytics.byHourOfDay
    .map((h) => h.slaAvg)
    .filter((v): v is number => v !== null);
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : analytics.kpis.slaAvg;
})();

const pctFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const intFormatter = new Intl.NumberFormat("pt-BR");

/** Format a 0..1 rate as a pt-BR percentage string, e.g. 0.7347 -> "73,5%". */
export function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${pctFormatter.format(rate * 100)}%`;
}

/** Format an already-percent value (0..100), e.g. 24.75 -> "24,8%". */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${pctFormatter.format(value)}%`;
}

export function formatInt(value: number): string {
  return intFormatter.format(value);
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Format an ISO timestamp as "dd/mm/aaaa às HH:MM" for pt-BR. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFormatter.format(d).replace(", ", " às ");
}

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Human range like "16 a 21 de setembro de 2026". */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "período indisponível";
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} a ${e.getDate()} de ${MONTHS_PT[e.getMonth()]} de ${e.getFullYear()}`;
  }
  return `${s.getDate()} de ${MONTHS_PT[s.getMonth()]} a ${e.getDate()} de ${MONTHS_PT[e.getMonth()]} de ${e.getFullYear()}`;
}

export const toneColor: Record<Tone, string> = {
  positive: "var(--positive)",
  info: "var(--info)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  neutral: "var(--neutral-soft)",
};

export type SlaLevel = "positive" | "normal" | "attention" | "critical";

/**
 * Semantic SLA level by rate — deliberately green-free.
 * cyan = positive, blue = normal, amber = attention, coral = critical.
 */
export function slaLevel(rate: number | null | undefined): SlaLevel {
  if (rate === null || rate === undefined) return "attention";
  if (rate >= 0.8) return "positive";
  if (rate >= 0.6) return "normal";
  if (rate >= 0.45) return "attention";
  return "critical";
}

export const slaLevelColor: Record<SlaLevel, string> = {
  positive: "var(--frenet-cyan)",
  normal: "var(--frenet-blue)",
  attention: "var(--warning)",
  critical: "var(--danger)",
};

/** Convenience: CSS color for an SLA rate. */
export function slaColor(rate: number | null | undefined): string {
  return slaLevelColor[slaLevel(rate)];
}

/** KPI card accent driven by the SLA level (green-free). */
export type KpiAccent =
  | "brand"
  | "positive"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "muted";

export function slaAccent(rate: number | null | undefined): KpiAccent {
  switch (slaLevel(rate)) {
    case "positive":
      return "positive";
    case "normal":
      return "brand";
    case "attention":
      return "warning";
    case "critical":
      return "danger";
  }
}
