"use client";

import {
  CalendarClock,
  CalendarDays,
  Gauge,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { DailySlaTrendChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { analytics, formatRate, slaAccent, slaColor } from "@/lib/analytics";

export function SemanalView() {
  const { baseSlaSemanal } = analytics;
  const { days, weeks, best, worst, latest, overall } = baseSlaSemanal;

  if (!days.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Info className="size-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Base SLA semanal indisponível</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Não há dados diários na aba{" "}
              <span className="font-medium">Base_sla_semanal</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section aria-label="Indicadores diários">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="SLA médio do período"
            value={formatRate(overall)}
            hint={`${days.length} dias · ${days[0].label}–${days[days.length - 1].label}`}
            accent={overall !== null ? slaAccent(overall) : "muted"}
            icon={<Gauge className="size-4" />}
          />
          <KpiCard
            label="Último dia registrado"
            value={latest ? formatRate(latest.slaAvg) : "—"}
            hint={latest ? `${latest.label} (${latest.weekday})` : undefined}
            accent={latest ? slaAccent(latest.slaAvg) : "muted"}
            icon={<CalendarClock className="size-4" />}
          />
          <KpiCard
            label="Melhor dia"
            value={best ? formatRate(best.slaAvg) : "—"}
            hint={best ? `${best.label} (${best.weekday})` : undefined}
            accent="positive"
            icon={<TrendingUp className="size-4" />}
          />
          <KpiCard
            label="Pior dia"
            value={worst ? formatRate(worst.slaAvg) : "—"}
            hint={worst ? `${worst.label} (${worst.weekday})` : undefined}
            accent="danger"
            icon={<TrendingDown className="size-4" />}
          />
        </div>
      </section>

      {/* Tendência diária */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              SLA por dia
            </CardTitle>
            <CardDescription>
              Evolução diária do SLA de entrega (azul/ciano ≥ 60%, âmbar 45–60%,
              coral &lt; 45%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailySlaTrendChart days={days} />
          </CardContent>
        </Card>
      </section>

      {/* Semanas + tabela */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Médias por semana</CardTitle>
            <CardDescription>Número da semana conforme a planilha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeks.map((w) => (
              <div
                key={w.numSemana}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{w.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.range} · {w.days} dias
                  </p>
                </div>
                <span
                  className="text-lg font-semibold tabular-nums"
                  style={{ color: slaColor(w.slaAvg) }}
                >
                  {formatRate(w.slaAvg)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalhamento diário</CardTitle>
            <CardDescription>Valores da aba Base_sla_semanal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Dia</th>
                    <th className="px-3 py-2 font-medium">Semana</th>
                    <th className="px-3 py-2 text-right font-medium">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 font-medium">{d.label}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{d.weekday}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {d.numSemana ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: slaColor(d.slaAvg) }}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: slaColor(d.slaAvg) }}
                          />
                          {formatRate(d.slaAvg)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Aba <span className="font-medium">Base_sla_semanal</span> · SLA médio por
        dia de entrega esperada, com o número da semana correspondente.
      </p>
    </div>
  );
}
