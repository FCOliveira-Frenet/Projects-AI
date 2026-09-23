"use client";

import {
  CalendarDays,
  Gauge,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { SlaByWeekChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { analytics, formatRate, slaAccent, slaColor } from "@/lib/analytics";

export function WeeklyView() {
  const { baseGeral } = analytics;
  const { weeks, total, best, worst } = baseGeral;

  if (!weeks.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Info className="size-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Base Geral indisponível</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Não há dados semanais na aba <span className="font-medium">Base Geral</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const spread =
    best && worst ? (best.slaAvg - worst.slaAvg) * 100 : null;

  return (
    <div className="space-y-6">
      {/* KPIs semanais */}
      <section aria-label="Indicadores semanais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="SLA geral (Base Geral)"
            value={formatRate(total)}
            hint="Consolidado das semanas"
            accent={total !== null ? slaAccent(total) : "muted"}
            icon={<Gauge className="size-4" />}
          />
          <KpiCard
            label="Semanas analisadas"
            value={String(weeks.length).replace(".", ",")}
            hint="Por semana de entrega esperada"
            accent="neutral"
            icon={<CalendarDays className="size-4" />}
          />
          <KpiCard
            label="Melhor semana"
            value={best ? formatRate(best.slaAvg) : "—"}
            hint={best ? `Semana de ${best.shortLabel}` : undefined}
            accent="positive"
            icon={<TrendingUp className="size-4" />}
          />
          <KpiCard
            label="Pior semana"
            value={worst ? formatRate(worst.slaAvg) : "—"}
            hint={worst ? `Semana de ${worst.shortLabel}` : undefined}
            accent="danger"
            icon={<TrendingDown className="size-4" />}
          />
        </div>
      </section>

      {/* Gráfico + tabela */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>SLA médio por semana</CardTitle>
            <CardDescription>
              Taxa de cumprimento consolidada por semana de entrega esperada
              (azul/ciano ≥ 60%, âmbar 45–60%, coral &lt; 45%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SlaByWeekChart weeks={weeks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhamento</CardTitle>
            <CardDescription>Valores da aba Base Geral.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Semana</th>
                    <th className="px-3 py-2 text-right font-medium">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.weekStart} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 text-muted-foreground">{w.label}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: slaColor(w.slaAvg) }}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: slaColor(w.slaAvg) }}
                          />
                          {formatRate(w.slaAvg)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {total !== null && (
                    <tr className="bg-muted/40 font-semibold">
                      <td className="px-3 py-2.5">Total geral</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatRate(total)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {spread !== null && (
              <p className="mt-4 text-xs text-muted-foreground">
                Variação entre a melhor e a pior semana:{" "}
                <span className="font-medium text-foreground">
                  {spread.toFixed(1).replace(".", ",")} p.p.
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Aba <span className="font-medium">Base Geral</span> · SLA consolidado por
        semana de entrega esperada, conforme a planilha de origem.
      </p>
    </div>
  );
}
