#!/usr/bin/env python3
"""Parse the J&T Express delivery-SLA workbook and emit derived analytics JSON.

The raw workbook is never shipped to the client. This script reads the xlsx
(by default straight from the shared Google Sheet), computes KPIs / time series
for the detailed base and the weekly "Base Geral" summary, and writes
``src/data/analytics.json`` which the Next.js app imports at build time.

Usage:
    python3 scripts/build_analytics.py                 # baixa do Google Sheets
    python3 scripts/build_analytics.py --local         # usa data/Base_SLA_J_T.xlsx
    python3 scripts/build_analytics.py caminho.xlsx    # usa um arquivo específico

Fonte online (Google Sheets, abas "Base SLA J&T" e "Base Geral"):
    https://docs.google.com/spreadsheets/d/1Q1eHkc7o47OXP8U8U51vlyXPaH5BHe1LC_1fXlOaM50
"""
from __future__ import annotations

import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "data" / "Base_SLA_J_T.xlsx"
OUT = ROOT / "src" / "data" / "analytics.json"
SHEET = "Base SLA J&T"
SHEET_GERAL = "Base Geral"
SHEET_SEMANAL = "Base_sla_semanal"

# Google Sheets that feeds the whole dashboard. The xlsx export keeps both tabs.
SHEET_ID = "1Q1eHkc7o47OXP8U8U51vlyXPaH5BHe1LC_1fXlOaM50"
SHEET_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
)
EXPORT_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
)

# A score of exactly 1.0 means "no prazo"; exactly 0.0 means "fora do prazo";
# anything strictly in between is a "parcial" delivery.
ON_TIME_EPS = 1e-9

MONTHS_PT = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
]
WEEKDAYS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]


def label_day(d: datetime) -> str:
    return f"{d.day:02d}/{d.month:02d}"


def label_day_long(d: datetime) -> str:
    return f"{d.day:02d} {MONTHS_PT[d.month - 1]} ({WEEKDAYS_PT[d.weekday()]})"


def label_week(start: datetime) -> str:
    end = start + timedelta(days=6)
    return f"{start.day:02d}/{start.month:02d} – {end.day:02d}/{end.month:02d}"


def download_sheet(dest: Path) -> None:
    """Download the shared Google Sheet as xlsx into ``dest``."""
    req = urllib.request.Request(EXPORT_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    if len(data) < 1024:
        raise SystemExit("Download da planilha retornou conteúdo inesperado (muito pequeno).")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def resolve_source() -> tuple[Path, str]:
    """Decide where the workbook comes from and return (path, origin_label)."""
    args = [a for a in sys.argv[1:] if a]
    if args and args[0] not in ("--local", "--online"):
        p = Path(args[0])
        if not p.exists():
            raise SystemExit(f"Arquivo de origem não encontrado: {p}")
        return p, f"arquivo local ({p.name})"

    if "--local" in args:
        if not DEFAULT_SRC.exists():
            raise SystemExit(f"Arquivo local não encontrado: {DEFAULT_SRC}")
        return DEFAULT_SRC, f"arquivo local ({DEFAULT_SRC.name})"

    # Default: pull straight from the Google Sheet, caching a local copy.
    try:
        download_sheet(DEFAULT_SRC)
        return DEFAULT_SRC, "Google Sheets (online)"
    except Exception as exc:  # noqa: BLE001 - fall back to cache, but be loud.
        if DEFAULT_SRC.exists():
            print(f"[aviso] Falha ao baixar do Google Sheets ({exc}); usando cópia local.")
            return DEFAULT_SRC, f"cópia local ({DEFAULT_SRC.name}) — download falhou"
        raise SystemExit(f"Falha ao baixar a planilha e não há cópia local: {exc}")


def parse_base_geral(wb) -> dict:
    """Parse the weekly 'Base Geral' summary tab (week -> SLA rate + total)."""
    if SHEET_GERAL not in wb.sheetnames:
        return {"metric": "SLA de Entrega", "weeks": [], "total": None, "best": None, "worst": None}

    ws = wb[SHEET_GERAL]
    weeks: list[dict] = []
    total: float | None = None
    for week, sla in ws.iter_rows(min_row=2, max_col=2, values_only=True):
        if sla is None or sla == "":
            continue
        rate = round(float(sla), 4)
        if isinstance(week, datetime):
            weeks.append(
                {
                    "weekStart": week.strftime("%Y-%m-%d"),
                    "label": label_week(week),
                    "shortLabel": f"{week.day:02d}/{week.month:02d}",
                    "slaAvg": rate,
                }
            )
        else:
            # Row without a week is the grand total.
            total = rate

    weeks.sort(key=lambda w: w["weekStart"])
    best = max(weeks, key=lambda w: w["slaAvg"], default=None)
    worst = min(weeks, key=lambda w: w["slaAvg"], default=None)
    return {"metric": "SLA de Entrega", "weeks": weeks, "total": total, "best": best, "worst": worst}


def parse_base_sla_semanal(wb) -> dict:
    """Parse the 'Base_sla_semanal' tab: daily SLA rate tagged with a week number."""
    empty = {"metric": "SLA de Entrega", "days": [], "weeks": [], "best": None, "worst": None, "latest": None, "overall": None}
    if SHEET_SEMANAL not in wb.sheetnames:
        return empty

    ws = wb[SHEET_SEMANAL]
    days: list[dict] = []
    # Rows 1-2 are a two-line header; data starts at row 3.
    for date, num_semana, sla in ws.iter_rows(min_row=3, max_col=3, values_only=True):
        if sla is None or sla == "" or not isinstance(date, datetime):
            continue
        days.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "label": f"{date.day:02d}/{date.month:02d}",
                "weekday": WEEKDAYS_PT[date.weekday()],
                "numSemana": int(num_semana) if num_semana is not None else None,
                "slaAvg": round(float(sla), 4),
            }
        )

    days.sort(key=lambda d: d["date"])
    if not days:
        return empty

    weeks_map: dict[int, list[dict]] = defaultdict(list)
    for d in days:
        if d["numSemana"] is not None:
            weeks_map[d["numSemana"]].append(d)
    weeks = []
    for num in sorted(weeks_map):
        wdays = weeks_map[num]
        avg = round(sum(x["slaAvg"] for x in wdays) / len(wdays), 4)
        weeks.append(
            {
                "numSemana": num,
                "label": f"Semana {num}",
                "slaAvg": avg,
                "days": len(wdays),
                "range": f"{wdays[0]['label']} – {wdays[-1]['label']}",
            }
        )

    best = max(days, key=lambda d: d["slaAvg"])
    worst = min(days, key=lambda d: d["slaAvg"])
    latest = days[-1]
    overall = round(sum(d["slaAvg"] for d in days) / len(days), 4)
    return {
        "metric": "SLA de Entrega",
        "days": days,
        "weeks": weeks,
        "best": best,
        "worst": worst,
        "latest": latest,
        "overall": overall,
    }


def main() -> None:
    src, origin = resolve_source()

    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    if SHEET not in wb.sheetnames:
        raise SystemExit(f"Aba '{SHEET}' não encontrada. Abas: {wb.sheetnames}")
    ws = wb[SHEET]
    base_geral = parse_base_geral(wb)
    base_sla_semanal = parse_base_sla_semanal(wb)

    total = 0
    no_info = 0
    on_time = 0
    late = 0
    partial = 0
    score_sum = 0.0
    scored = 0

    by_day: dict[str, dict] = defaultdict(lambda: {"sum": 0.0, "scored": 0, "volume": 0})
    by_hod: dict[int, dict] = defaultdict(lambda: {"sum": 0.0, "scored": 0, "volume": 0})
    by_bucket: dict[str, dict] = defaultdict(lambda: {"sum": 0.0, "scored": 0, "volume": 0})

    min_dt: datetime | None = None
    max_dt: datetime | None = None

    # Data starts at row 3 (rows 1-2 are the two-line header).
    for seq, dt, sla in ws.iter_rows(min_row=3, max_col=3, values_only=True):
        if seq is None and dt is None and sla is None:
            continue
        total += 1

        if isinstance(dt, datetime):
            if min_dt is None or dt < min_dt:
                min_dt = dt
            if max_dt is None or dt > max_dt:
                max_dt = dt

        has_score = sla is not None and sla != ""
        if not has_score:
            no_info += 1
        else:
            value = float(sla)
            score_sum += value
            scored += 1
            if value >= 1.0 - ON_TIME_EPS:
                on_time += 1
            elif value <= ON_TIME_EPS:
                late += 1
            else:
                partial += 1

        if isinstance(dt, datetime):
            day_key = dt.strftime("%Y-%m-%d")
            by_day[day_key]["volume"] += 1
            by_hod[dt.hour]["volume"] += 1
            bucket_key = dt.strftime("%Y-%m-%dT%H:00")
            by_bucket[bucket_key]["volume"] += 1
            if has_score:
                v = float(sla)
                by_day[day_key]["sum"] += v
                by_day[day_key]["scored"] += 1
                by_hod[dt.hour]["sum"] += v
                by_hod[dt.hour]["scored"] += 1
                by_bucket[bucket_key]["sum"] += v
                by_bucket[bucket_key]["scored"] += 1

    def rate(s: dict) -> float | None:
        return round(s["sum"] / s["scored"], 4) if s["scored"] else None

    days = []
    for key in sorted(by_day):
        d = datetime.strptime(key, "%Y-%m-%d")
        s = by_day[key]
        days.append(
            {
                "date": key,
                "label": label_day(d),
                "labelLong": label_day_long(d),
                "volume": s["volume"],
                "scored": s["scored"],
                "slaAvg": rate(s),
            }
        )

    hour_of_day = []
    for h in range(24):
        s = by_hod.get(h, {"sum": 0.0, "scored": 0, "volume": 0})
        hour_of_day.append(
            {
                "hour": h,
                "label": f"{h:02d}h",
                "volume": s["volume"],
                "scored": s["scored"],
                "slaAvg": rate(s),
            }
        )

    time_series = []
    for key in sorted(by_bucket):
        d = datetime.strptime(key, "%Y-%m-%dT%H:00")
        s = by_bucket[key]
        time_series.append(
            {
                "ts": key,
                "label": f"{d.day:02d}/{d.month:02d} {d.hour:02d}h",
                "shortLabel": f"{d.hour:02d}h",
                "day": key[:10],
                "volume": s["volume"],
                "scored": s["scored"],
                "slaAvg": rate(s),
            }
        )

    sla_avg = round(score_sum / scored, 4) if scored else 0.0

    def pct(n: int) -> float:
        return round(100 * n / scored, 2) if scored else 0.0

    status_distribution = [
        {"key": "onTime", "label": "No prazo", "count": on_time, "pct": pct(on_time), "tone": "positive"},
        {"key": "partial", "label": "Parcial", "count": partial, "pct": pct(partial), "tone": "warning"},
        {"key": "late", "label": "Atrasadas", "count": late, "pct": pct(late), "tone": "danger"},
        {"key": "noInfo", "label": "Em análise", "count": no_info, "pct": None, "tone": "neutral"},
    ]

    best_day = max((d for d in days if d["slaAvg"] is not None), key=lambda d: d["slaAvg"], default=None)
    worst_day = min((d for d in days if d["slaAvg"] is not None), key=lambda d: d["slaAvg"], default=None)
    # Worst hourly buckets need enough volume to be meaningful.
    meaningful = [b for b in time_series if b["scored"] and b["scored"] >= 20]
    worst_buckets = sorted(meaningful, key=lambda b: b["slaAvg"])[:5]

    payload = {
        "meta": {
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "sourceFile": src.name,
            "sheet": SHEET,
            "carrier": "J&T Express",
            "origin": origin,
            "sheetUrl": SHEET_URL,
            "dateRange": {
                "start": min_dt.isoformat() if min_dt else None,
                "end": max_dt.isoformat() if max_dt else None,
            },
        },
        "kpis": {
            "slaAvg": sla_avg,
            "totalDeliveries": total,
            "scored": scored,
            "onTime": on_time,
            "late": late,
            "partial": partial,
            "noInfo": no_info,
        },
        "statusDistribution": status_distribution,
        "byDay": days,
        "byHourOfDay": hour_of_day,
        "timeSeries": time_series,
        "highlights": {
            "bestDay": best_day,
            "worstDay": worst_day,
            "worstBuckets": worst_buckets,
        },
        "baseGeral": base_geral,
        "baseSlaSemanal": base_sla_semanal,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK -> {OUT.relative_to(ROOT)}  (origem: {origin})")
    print(
        f"total={total} scored={scored} slaAvg={sla_avg:.4f} "
        f"onTime={on_time} partial={partial} late={late} noInfo={no_info} days={len(days)}"
    )
    print(
        f"Base Geral: semanas={len(base_geral['weeks'])} total={base_geral['total']}"
    )
    print(
        f"Base_sla_semanal: dias={len(base_sla_semanal['days'])} "
        f"semanas={len(base_sla_semanal['weeks'])} overall={base_sla_semanal['overall']}"
    )


if __name__ == "__main__":
    main()
