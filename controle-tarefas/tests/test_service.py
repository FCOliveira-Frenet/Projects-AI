"""Testes das regras de negocio do servico de tarefas."""

from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from app.models import Priority, Recurrence, Status, TaskCreate, TaskUpdate
from app.service import BusinessRuleError, TaskNotFoundError, TaskService
from tests.conftest import FIXED_NOW


def _nova_tarefa(**overrides) -> TaskCreate:
    """Monta um TaskCreate valido, permitindo sobrescrever campos pontuais."""
    dados = {"title": "Pagar aluguel", "due_date": date(2026, 3, 10)}
    dados.update(overrides)
    return TaskCreate(**dados)


class TestCriacao:
    def test_tarefa_nasce_pendente_com_data_de_criacao_do_relogio(
        self, service: TaskService
    ):
        # Arrange
        dados = _nova_tarefa(title="Revisar contrato")

        # Act
        tarefa = service.create(dados)

        # Assert
        assert tarefa.id > 0
        assert tarefa.status is Status.PENDENTE
        assert tarefa.created_at == FIXED_NOW
        assert tarefa.completed_at is None

    def test_titulo_e_normalizado(self, service: TaskService):
        tarefa = service.create(_nova_tarefa(title="   Comprar pao   "))

        assert tarefa.title == "Comprar pao"

    def test_titulo_vazio_e_rejeitado(self):
        with pytest.raises(ValidationError):
            _nova_tarefa(title="   ")

    def test_recorrencia_sem_vencimento_e_rejeitada(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="Academia", recurrence=Recurrence.SEMANAL)

    def test_prioridade_padrao_e_media(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())

        assert tarefa.priority is Priority.MEDIA


class TestConclusao:
    def test_conclusao_marca_status_e_horario(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())

        resultado = service.complete(tarefa.id)

        assert resultado.task.status is Status.CONCLUIDA
        assert resultado.task.completed_at == FIXED_NOW

    def test_tarefa_sem_recorrencia_nao_gera_nova_ocorrencia(
        self, service: TaskService
    ):
        tarefa = service.create(_nova_tarefa(recurrence=Recurrence.NENHUMA))

        resultado = service.complete(tarefa.id)

        assert resultado.next_occurrence is None
        assert len(service.list()) == 1

    def test_tarefa_recorrente_gera_proxima_ocorrencia_pendente(
        self, service: TaskService
    ):
        # Arrange
        tarefa = service.create(
            _nova_tarefa(
                title="Academia",
                due_date=date(2026, 3, 10),
                recurrence=Recurrence.SEMANAL,
            )
        )

        # Act
        resultado = service.complete(tarefa.id)

        # Assert
        proxima = resultado.next_occurrence
        assert proxima is not None
        assert proxima.id != tarefa.id
        assert proxima.title == "Academia"
        assert proxima.due_date == date(2026, 3, 17)
        assert proxima.status is Status.PENDENTE
        assert proxima.completed_at is None
        assert proxima.recurrence is Recurrence.SEMANAL

    def test_conclusoes_sucessivas_encadeiam_as_ocorrencias(
        self, service: TaskService
    ):
        tarefa = service.create(
            _nova_tarefa(due_date=date(2026, 1, 31), recurrence=Recurrence.MENSAL)
        )

        primeira = service.complete(tarefa.id).next_occurrence
        assert primeira is not None
        segunda = service.complete(primeira.id).next_occurrence

        assert primeira.due_date == date(2026, 2, 28)
        assert segunda is not None
        assert segunda.due_date == date(2026, 3, 28)

    def test_concluir_duas_vezes_e_rejeitado(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())
        service.complete(tarefa.id)

        with pytest.raises(BusinessRuleError, match="ja esta concluida"):
            service.complete(tarefa.id)

    def test_concluir_tarefa_inexistente_e_rejeitado(self, service: TaskService):
        with pytest.raises(TaskNotFoundError):
            service.complete(999)


class TestReabertura:
    def test_reabrir_limpa_a_conclusao(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())
        service.complete(tarefa.id)

        reaberta = service.reopen(tarefa.id)

        assert reaberta.status is Status.PENDENTE
        assert reaberta.completed_at is None

    def test_reabrir_tarefa_pendente_e_rejeitado(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())

        with pytest.raises(BusinessRuleError, match="ja esta pendente"):
            service.reopen(tarefa.id)


class TestAtualizacao:
    def test_campos_ausentes_sao_preservados(self, service: TaskService):
        tarefa = service.create(_nova_tarefa(title="Original", description="Detalhe"))

        atualizada = service.update(tarefa.id, TaskUpdate(title="Novo titulo"))

        assert atualizada.title == "Novo titulo"
        assert atualizada.description == "Detalhe"
        assert atualizada.due_date == tarefa.due_date

    def test_vencimento_pode_ser_removido(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())

        atualizada = service.update(tarefa.id, TaskUpdate(due_date=None))

        assert atualizada.due_date is None

    def test_tornar_recorrente_sem_vencimento_e_rejeitado(self, service: TaskService):
        tarefa = service.create(_nova_tarefa(due_date=None))

        with pytest.raises(BusinessRuleError, match="data de vencimento"):
            service.update(tarefa.id, TaskUpdate(recurrence=Recurrence.DIARIA))

    def test_atualizar_tarefa_inexistente_e_rejeitado(self, service: TaskService):
        with pytest.raises(TaskNotFoundError):
            service.update(999, TaskUpdate(title="Qualquer"))


class TestListagemEExclusao:
    def test_filtra_por_status(self, service: TaskService):
        pendente = service.create(_nova_tarefa(title="Pendente"))
        concluida = service.create(_nova_tarefa(title="Concluida"))
        service.complete(concluida.id)

        resultado = service.list(status=Status.PENDENTE)

        assert [t.id for t in resultado] == [pendente.id]

    def test_filtra_por_prioridade(self, service: TaskService):
        alta = service.create(_nova_tarefa(priority=Priority.ALTA))
        service.create(_nova_tarefa(priority=Priority.BAIXA))

        resultado = service.list(priority=Priority.ALTA)

        assert [t.id for t in resultado] == [alta.id]

    def test_pendentes_vem_antes_das_concluidas(self, service: TaskService):
        concluida = service.create(_nova_tarefa(title="Primeira"))
        service.complete(concluida.id)
        pendente = service.create(_nova_tarefa(title="Segunda"))

        resultado = service.list()

        assert [t.id for t in resultado] == [pendente.id, concluida.id]

    def test_tarefas_sem_vencimento_vao_para_o_fim(self, service: TaskService):
        sem_data = service.create(_nova_tarefa(title="Sem data", due_date=None))
        com_data = service.create(_nova_tarefa(title="Com data"))

        resultado = service.list()

        assert [t.id for t in resultado] == [com_data.id, sem_data.id]

    def test_exclusao_remove_a_tarefa(self, service: TaskService):
        tarefa = service.create(_nova_tarefa())

        service.delete(tarefa.id)

        assert service.list() == []

    def test_excluir_tarefa_inexistente_e_rejeitado(self, service: TaskService):
        with pytest.raises(TaskNotFoundError):
            service.delete(999)
