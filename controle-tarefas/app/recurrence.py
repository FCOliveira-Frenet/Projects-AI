"""Calculo da data de vencimento da proxima ocorrencia de uma tarefa recorrente.

Modulo puro: sem acesso a banco, rede ou relogio do sistema.
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta

from app.models import Recurrence


def next_due_date(current_due_date: date, recurrence: Recurrence) -> date:
    """Calcula o vencimento da proxima ocorrencia.

    O calculo parte sempre do vencimento atual, e nao da data de hoje.
    Assim, uma tarefa diaria atrasada gera a ocorrencia do dia seguinte ao
    vencimento perdido, preservando o historico em vez de pular dias.

    Args:
        current_due_date: Vencimento da ocorrencia que acabou de ser concluida.
        recurrence: Periodicidade da tarefa.

    Returns:
        A data de vencimento da proxima ocorrencia.

    Raises:
        ValueError: Se a periodicidade for `NENHUMA` ou desconhecida.
    """
    if recurrence is Recurrence.NENHUMA:
        raise ValueError(
            "Nao existe proxima ocorrencia para uma tarefa sem recorrencia."
        )
    if recurrence is Recurrence.DIARIA:
        return current_due_date + timedelta(days=1)
    if recurrence is Recurrence.SEMANAL:
        return current_due_date + timedelta(weeks=1)
    if recurrence is Recurrence.MENSAL:
        return _add_one_month(current_due_date)
    raise ValueError(f"Periodicidade nao suportada: {recurrence!r}")


def _add_one_month(value: date) -> date:
    """Avanca um mes mantendo o dia, ajustando para meses mais curtos.

    Nem todo mes tem o mesmo numero de dias, entao 31/01 vira 28/02 (ou 29/02
    em ano bissexto). Consequencia aceita: o dia nao volta a subir depois do
    ajuste, ou seja, 31/01 -> 28/02 -> 28/03. Manter o dia original exigiria
    guardar a data de origem da serie, complexidade que nao se justifica aqui.
    """
    # Indice base zero do mes seguinte, permitindo a virada de ano pelo resto.
    next_month_index = value.month
    year = value.year + next_month_index // 12
    month = next_month_index % 12 + 1
    last_day_of_month = calendar.monthrange(year, month)[1]
    return date(year, month, min(value.day, last_day_of_month))
