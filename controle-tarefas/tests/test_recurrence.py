"""Testes da regra de calculo da proxima ocorrencia."""

from __future__ import annotations

from datetime import date

import pytest

from app.models import Recurrence
from app.recurrence import next_due_date


def test_diaria_avanca_um_dia():
    # Arrange
    vencimento = date(2026, 3, 10)

    # Act
    proximo = next_due_date(vencimento, Recurrence.DIARIA)

    # Assert
    assert proximo == date(2026, 3, 11)


def test_semanal_avanca_sete_dias():
    vencimento = date(2026, 3, 10)

    proximo = next_due_date(vencimento, Recurrence.SEMANAL)

    assert proximo == date(2026, 3, 17)


def test_mensal_mantem_o_dia_quando_o_mes_seguinte_comporta():
    vencimento = date(2026, 3, 10)

    proximo = next_due_date(vencimento, Recurrence.MENSAL)

    assert proximo == date(2026, 4, 10)


def test_mensal_ajusta_para_o_ultimo_dia_de_fevereiro():
    vencimento = date(2026, 1, 31)

    proximo = next_due_date(vencimento, Recurrence.MENSAL)

    assert proximo == date(2026, 2, 28)


def test_mensal_considera_ano_bissexto():
    vencimento = date(2028, 1, 31)

    proximo = next_due_date(vencimento, Recurrence.MENSAL)

    assert proximo == date(2028, 2, 29)


def test_mensal_atravessa_a_virada_de_ano():
    vencimento = date(2026, 12, 15)

    proximo = next_due_date(vencimento, Recurrence.MENSAL)

    assert proximo == date(2027, 1, 15)


def test_diaria_atravessa_a_virada_de_ano():
    vencimento = date(2026, 12, 31)

    proximo = next_due_date(vencimento, Recurrence.DIARIA)

    assert proximo == date(2027, 1, 1)


def test_sem_recorrencia_e_rejeitado():
    vencimento = date(2026, 3, 10)

    with pytest.raises(ValueError, match="sem recorrencia"):
        next_due_date(vencimento, Recurrence.NENHUMA)
