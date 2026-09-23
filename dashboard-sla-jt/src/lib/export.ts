import type { TabId } from "@/components/dashboard/tab-context";
import { analytics } from "@/lib/analytics";

type Cell = string | number | null;

function formatRatePct(rate: number | null): string {
  if (rate === null || rate === undefined) return "";
  return (rate * 100).toFixed(1).replace(".", ",");
}

/** Build a `;`-separated CSV (Excel pt-BR friendly) with a UTF-8 BOM. */
function toCsv(headers: string[], rows: Cell[][]): string {
  const escape = (value: Cell): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExportResult {
  filename: string;
  rows: number;
}

/**
 * Export the dataset behind the currently active tab as a CSV download.
 * Reuses the already-computed analytics — no raw spreadsheet is shipped.
 */
export function exportTab(active: TabId): ExportResult {
  let headers: string[];
  let rows: Cell[][];
  let filename: string;

  switch (active) {
    case "geral": {
      const { weeks, total } = analytics.baseGeral;
      headers = ["Semana", "SLA (%)"];
      rows = weeks.map((w) => [w.label, formatRatePct(w.slaAvg)]);
      if (total !== null) rows.push(["Total geral", formatRatePct(total)]);
      filename = "sla-base-geral-jt.csv";
      break;
    }
    case "semanal": {
      const { days } = analytics.baseSlaSemanal;
      headers = ["Data", "Dia da semana", "Semana", "SLA (%)"];
      rows = days.map((d) => [d.label, d.weekday, d.numSemana ?? "", formatRatePct(d.slaAvg)]);
      filename = "sla-diario-jt.csv";
      break;
    }
    case "detalhado":
    default: {
      const { byDay } = analytics;
      headers = ["Data", "Volume", "Com nota", "SLA (%)"];
      rows = byDay.map((d) => [d.labelLong, d.volume, d.scored, formatRatePct(d.slaAvg)]);
      filename = "sla-por-dia-jt.csv";
      break;
    }
  }

  triggerDownload(filename, toCsv(headers, rows));
  return { filename, rows: rows.length };
}
