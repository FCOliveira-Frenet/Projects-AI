"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  analytics,
  formatInt,
  formatRate,
  slaColor,
  toneColor,
  type DayPoint,
  type HourPoint,
  type SemanalDay,
  type StatusSlice,
  type WeekPoint,
} from "@/lib/analytics";

const AXIS = "var(--muted-foreground)";
const GRID = "var(--border)";

/* Frenet chart palette — blue is the base, cyan for good, coral for problems. */
const BLUE = "var(--frenet-blue)";
const CYAN = "var(--frenet-cyan)";

function TooltipShell({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-medium text-popover-foreground">{title}</p>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-muted-foreground">
            {r.color && (
              <span className="inline-block size-2 rounded-full" style={{ background: r.color }} />
            )}
            <span>{r.label}</span>
            <span className="ml-auto font-medium text-popover-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SLA por hora (série temporal cronológica ao longo do período)      */
/* ------------------------------------------------------------------ */
export function HourlyTrendChart() {
  const data = analytics.timeSeries.map((p) => ({
    ...p,
    ratePct: p.slaAvg === null ? null : Math.round(p.slaAvg * 1000) / 10,
  }));

  // One tick per day boundary keeps the long axis legible.
  const dayStarts = new Set<string>();
  const ticks = data
    .filter((p) => {
      if (dayStarts.has(p.day)) return false;
      dayStarts.add(p.day);
      return true;
    })
    .map((p) => p.ts);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="slaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
            <stop offset="55%" stopColor={CYAN} stopOpacity={0.12} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="ts"
          ticks={ticks}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          }}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: GRID }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipShell
                title={p.label}
                rows={[
                  { label: "SLA médio", value: formatRate(p.slaAvg), color: slaColor(p.slaAvg) },
                  { label: "Entregas", value: formatInt(p.volume) },
                ]}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="ratePct"
          stroke={BLUE}
          strokeWidth={2}
          fill="url(#slaFill)"
          connectNulls
          dot={(props) => {
            const { cx, cy, payload, index } = props as {
              cx: number;
              cy: number;
              payload: (typeof data)[number];
              index: number;
            };
            // Highlight only critical points in coral, everything else stays clean.
            if (payload.slaAvg === null || payload.slaAvg >= 0.45) {
              return <g key={index} />;
            }
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={3.5}
                fill="var(--danger)"
                stroke="var(--card)"
                strokeWidth={1.5}
              />
            );
          }}
          activeDot={{ r: 3, strokeWidth: 0, fill: BLUE }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Distribuição de status (donut)                                     */
/* ------------------------------------------------------------------ */
export function StatusDonutChart({ slices }: { slices: StatusSlice[] }) {
  const data = slices.map((s) => ({ ...s, fill: toneColor[s.tone] }));
  const total = data.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((s) => (
                <Cell key={s.key} fill={s.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <TooltipShell
                    title={p.label}
                    rows={[
                      { label: "Entregas", value: formatInt(p.count), color: p.fill },
                      { label: "Participação", value: p.pct === null ? "—" : `${p.pct.toString().replace(".", ",")}%` },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight">{formatInt(total)}</span>
          <span className="text-xs text-muted-foreground">registros</span>
        </div>
      </div>
      <ul className="w-full max-w-xs space-y-3">
        {data.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className="size-2.5 rounded-full" style={{ background: s.fill }} />
            <span className="text-sm font-medium">{s.label}</span>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {formatInt(s.count)}
              {s.pct !== null && (
                <span className="ml-2 text-xs">({s.pct.toString().replace(".", ",")}%)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Volume de entregas por dia (barras)                                */
/* ------------------------------------------------------------------ */
export function VolumeByDayChart({ days }: { days: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={days} margin={{ top: 20, right: 12, left: -14, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          tickFormatter={(v: number) => formatInt(v)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as DayPoint;
            return (
              <TooltipShell
                title={p.labelLong}
                rows={[
                  { label: "Entregas", value: formatInt(p.volume), color: BLUE },
                  { label: "Com nota", value: formatInt(p.scored) },
                  { label: "SLA médio", value: formatRate(p.slaAvg) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="volume" fill={BLUE} radius={[6, 6, 0, 0]} maxBarSize={64}>
          <LabelList
            dataKey="volume"
            position="top"
            formatter={(v) => formatInt(Number(v))}
            style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Comparativo de SLA por dia (barras coloridas por desempenho)       */
/* ------------------------------------------------------------------ */
export function SlaByDayChart({ days }: { days: DayPoint[] }) {
  const data = days.map((d) => ({
    ...d,
    ratePct: d.slaAvg === null ? 0 : Math.round(d.slaAvg * 1000) / 10,
    fill: slaColor(d.slaAvg),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipShell
                title={p.labelLong}
                rows={[
                  { label: "SLA médio", value: formatRate(p.slaAvg), color: p.fill },
                  { label: "Entregas com nota", value: formatInt(p.scored) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="ratePct" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {data.map((d) => (
            <Cell key={d.date} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* SLA médio por hora do dia (barras) com linha de média              */
/* ------------------------------------------------------------------ */
export function SlaByHourOfDayChart({
  hours,
  avg,
}: {
  hours: HourPoint[];
  avg: number;
}) {
  const data = hours
    .filter((h) => h.slaAvg !== null)
    .map((h) => ({
      ...h,
      ratePct: Math.round((h.slaAvg as number) * 1000) / 10,
      fill: slaColor(h.slaAvg),
    }));
  const avgPct = Math.round(avg * 1000) / 10;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <XAxis
          dataKey="label"
          interval={1}
          tick={{ fill: AXIS, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipShell
                title={`${p.label}`}
                rows={[
                  { label: "SLA médio", value: formatRate(p.slaAvg), color: p.fill },
                  { label: "Entregas", value: formatInt(p.volume) },
                ]}
              />
            );
          }}
        />
        <ReferenceLine
          y={avgPct}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          label={{
            value: `Média ${avgPct.toString().replace(".", ",")}%`,
            position: "insideTopRight",
            fill: "var(--muted-foreground)",
            fontSize: 11,
          }}
        />
        <Bar dataKey="ratePct" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((h) => (
            <Cell key={h.hour} fill={h.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Base Geral — SLA por semana (barras)                               */
/* ------------------------------------------------------------------ */
export function SlaByWeekChart({ weeks }: { weeks: WeekPoint[] }) {
  const data = weeks.map((w) => ({
    ...w,
    ratePct: Math.round(w.slaAvg * 1000) / 10,
    fill: slaColor(w.slaAvg),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: -14, bottom: 0 }}>
        <XAxis
          dataKey="shortLabel"
          tick={{ fill: AXIS, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipShell
                title={`Semana de ${p.label}`}
                rows={[{ label: "SLA médio", value: formatRate(p.slaAvg), color: p.fill }]}
              />
            );
          }}
        />
        <Bar dataKey="ratePct" radius={[8, 8, 0, 0]} maxBarSize={120}>
          <LabelList
            dataKey="ratePct"
            position="top"
            formatter={(v) => `${String(v).replace(".", ",")}%`}
            style={{ fill: "var(--foreground)", fontSize: 13, fontWeight: 600 }}
          />
          {data.map((w) => (
            <Cell key={w.weekStart} fill={w.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Base_sla_semanal — SLA diário (tendência) com marcação de semana   */
/* ------------------------------------------------------------------ */
export function DailySlaTrendChart({ days }: { days: SemanalDay[] }) {
  const data = days.map((d) => ({
    ...d,
    ratePct: Math.round(d.slaAvg * 1000) / 10,
    dot: slaColor(d.slaAvg),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 20, right: 16, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
            <stop offset="55%" stopColor={CYAN} stopOpacity={0.12} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: GRID }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipShell
                title={`${p.label} (${p.weekday})`}
                rows={[
                  { label: "SLA", value: formatRate(p.slaAvg), color: p.dot },
                  ...(p.numSemana !== null
                    ? [{ label: "Semana", value: String(p.numSemana) }]
                    : []),
                ]}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="ratePct"
          stroke={BLUE}
          strokeWidth={2.5}
          fill="url(#dailyFill)"
          dot={(props) => {
            const { cx, cy, payload, index } = props as {
              cx: number;
              cy: number;
              payload: (typeof data)[number];
              index: number;
            };
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.dot}
                stroke="var(--card)"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        >
          <LabelList
            dataKey="ratePct"
            position="top"
            formatter={(v) => `${String(v).replace(".", ",")}%`}
            style={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
