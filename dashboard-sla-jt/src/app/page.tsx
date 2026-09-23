import { CircleSlash, ExternalLink } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { analytics, formatDateRange, formatDateTime } from "@/lib/analytics";

export default function DashboardPage() {
  const { kpis, meta } = analytics;
  const rangeLabel = formatDateRange(meta.dateRange.start, meta.dateRange.end);
  const updatedAt = formatDateTime(meta.generatedAt);
  const hasData = kpis.totalDeliveries > 0;

  return (
    <DashboardShell carrier="J&T Express" rangeLabel={rangeLabel} updatedAt={updatedAt}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            J&amp;T Express · {rangeLabel}
          </p>
          <h2 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight sm:text-2xl">
            Dashboard SLA de Entregas
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acompanhamento do cumprimento de SLA das entregas da transportadora J&amp;T
            Express — taxa média, volume, distribuição de status e evolução ao longo
            do período analisado.
          </p>
        </section>

        {!hasData ? <EmptyState /> : <DashboardTabs />}

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center gap-1">
            <span>Fonte:</span>
            <a
              href={meta.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              Google Sheets — {meta.origin.includes("online") ? "conectado" : meta.origin}
              <ExternalLink className="size-3" />
            </a>
            <span>· abas {meta.sheet}, Base Geral e Base_sla_semanal.</span>
            <span>
              Métricas pré-calculadas a partir da planilha — o arquivo bruto não é
              enviado ao navegador.
            </span>
          </p>
        </footer>
      </div>
    </DashboardShell>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CircleSlash className="size-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">Nenhum dado disponível</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Não há registros de entrega para exibir. Gere as métricas executando{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npm run build:data
            </code>{" "}
            e recarregue a página.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
