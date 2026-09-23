"use client";

import {
  AlertTriangle,
  Clock,
  Gauge,
  PackageX,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  HourlyTrendChart,
  SlaByHourOfDayChart,
  StatusDonutChart,
  VolumeByDayChart,
} from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analytics,
  avgHourlySla,
  formatInt,
  formatPct,
  formatRate,
  overallSla,
  slaAccent,
  slaColor,
} from "@/lib/analytics";

export function DetailedView() {
  const { kpis, meta, statusDistribution, byDay, byHourOfDay, timeSeries } = analytics;
  const latePct = kpis.scored ? (kpis.late / kpis.scored) * 100 : 0;

  // SLA por hora — resumo (média, melhor e pior hora do dia).
  const scoredHours = byHourOfDay.filter((h) => h.slaAvg !== null);
  const peakHour = scoredHours.reduce<(typeof scoredHours)[number] | null>(
    (best, h) => (best === null || (h.slaAvg as number) > (best.slaAvg as number) ? h : best),
    null,
  );
  const worstHour = scoredHours.reduce<(typeof scoredHours)[number] | null>(
    (worst, h) => (worst === null || (h.slaAvg as number) < (worst.slaAvg as number) ? h : worst),
    null,
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="SLA médio por Hr"
            value={formatRate(avgHourlySla)}
            hint="Média das taxas horárias"
            accent={slaAccent(avgHourlySla)}
            icon={<Gauge className="size-4" />}
          />
          <KpiCard
            label="Total de pedidos"
            value={formatInt(kpis.totalDeliveries)}
            hint="Registros no período"
            accent="neutral"
            icon={<ShoppingBag className="size-4" />}
          />
          <KpiCard
            label="Atrasados"
            value={formatPct(latePct)}
            hint="Taxa das entregas avaliadas"
            accent="danger"
            icon={<AlertTriangle className="size-4" />}
          />
          <KpiCard
            label="Entregas atrasadas"
            value={formatInt(kpis.late)}
            hint={`${latePct.toFixed(1).replace(".", ",")}% das avaliadas`}
            accent="danger"
            icon={<PackageX className="size-4" />}
          />
        </div>
      </section>

      {/* SLA por hora — gráfico principal */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-brand" />
                  SLA por hora
                </CardTitle>
                <CardDescription>
                  Taxa média de cumprimento por hora ao longo do período (
                  {timeSeries.length} intervalos horários).
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="border-brand/30 bg-brand/10 font-medium text-brand"
              >
                Média por Hr {formatRate(avgHourlySla)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatBox
                label="Média por Hr"
                value={formatRate(avgHourlySla)}
                dot={slaColor(avgHourlySla)}
              />
              <StatBox
                label="Pico"
                value={peakHour ? formatRate(peakHour.slaAvg) : "—"}
                hint={peakHour ? peakHour.label : undefined}
                dot={peakHour ? slaColor(peakHour.slaAvg) : undefined}
              />
              <StatBox
                label="Pior horário"
                value={worstHour ? formatRate(worstHour.slaAvg) : "—"}
                hint={worstHour ? worstHour.label : undefined}
                dot={worstHour ? slaColor(worstHour.slaAvg) : undefined}
              />
            </div>
            <HourlyTrendChart />
          </CardContent>
        </Card>
      </section>

      {/* Distribuição + SLA por dia */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de status</CardTitle>
            <CardDescription>
              Participação de cada status sobre as entregas avaliadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonutChart slices={statusDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA médio por hora</CardTitle>
            <CardDescription>
              Média por hora do dia (0h–23h), com a linha de média geral. Azul/ciano
              ≥ 60%, âmbar 45–60%, coral &lt; 45%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SlaByHourOfDayChart hours={byHourOfDay} avg={avgHourlySla} />
          </CardContent>
        </Card>
      </section>

      {/* Volume por dia */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Volume de entregas por dia</CardTitle>
            <CardDescription>
              Quantidade total de entregas registradas em cada dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VolumeByDayChart days={byDay} />
          </CardContent>
        </Card>
      </section>

      {/* Destaques */}
      <section>
        <Highlights />
      </section>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          O <span className="font-medium">SLA médio por Hr</span> é a média das
          taxas horárias da aba{" "}
          <span className="font-medium">{meta.sheet}</span> no período coberto.
          Para referência, o SLA consolidado do Delfos (aba Base Geral) é{" "}
          <span className="font-medium">{formatRate(overallSla)}</span>.
        </p>
        <p>
          Entregas sem nota de SLA são contabilizadas à parte e excluídas do
          cálculo das taxas.
        </p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
  dot,
}: {
  label: string;
  value: string;
  hint?: string;
  dot?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        {dot && (
          <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
        )}
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function Highlights() {
  const { bestDay, worstDay, worstBuckets } = analytics.highlights;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="border-positive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-positive" />
            Melhor dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestDay ? (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-positive">
                {formatRate(bestDay.slaAvg)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {bestDay.labelLong} · {formatInt(bestDay.volume)} entregas
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="size-4 text-danger" />
            Pior dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {worstDay ? (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-danger">
                {formatRate(worstDay.slaAvg)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {worstDay.labelLong} · {formatInt(worstDay.volume)} entregas
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-warning" />
            Horas mais críticas
          </CardTitle>
          <CardDescription>Menor SLA (mín. 20 entregas avaliadas)</CardDescription>
        </CardHeader>
        <CardContent>
          {worstBuckets.length ? (
            <ul className="space-y-2">
              {worstBuckets.map((b) => (
                <li key={b.ts} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium tabular-nums text-danger">
                    {formatRate(b.slaAvg)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
