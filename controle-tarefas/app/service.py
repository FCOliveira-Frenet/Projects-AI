"""Regras de negocio do controle de tarefas.

O servico recebe o repositorio e o relogio por injecao, de modo que os testes
possam usar um banco em memoria e um tempo fixo, sem tocar em I/O real.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone

from app.models import (
    UNSAVED_TASK_ID,
    CompletionResult,
    Priority,
    Recurrence,
    Status,
    Task,
    TaskCreate,
    TaskUpdate,
)
from app.recurrence import next_due_date
from app.repository import TaskRepository


class TaskError(Exception):
    """Erro de dominio do controle de tarefas."""


class TaskNotFoundError(TaskError):
    """A tarefa referenciada nao existe."""

    def __init__(self, task_id: int) -> None:
        super().__init__(
            f"Tarefa {task_id} nao encontrada. "
            "Confira o id ou recarregue a lista de tarefas."
        )
        self.task_id = task_id


class BusinessRuleError(TaskError):
    """A operacao e valida em formato, mas conflita com o estado atual."""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TaskService:
    """Casos de uso de criacao, consulta e evolucao de tarefas."""

    def __init__(
        self,
        repository: TaskRepository,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._repository = repository
        self._now = now or _utc_now

    def create(self, data: TaskCreate) -> Task:
        """Cria uma tarefa pendente."""
        new_task = Task(
            id=UNSAVED_TASK_ID,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            priority=data.priority,
            status=Status.PENDENTE,
            recurrence=data.recurrence,
            created_at=self._now(),
            completed_at=None,
        )
        return self._repository.add(new_task)

    def list(
        self,
        status: Status | None = None,
        priority: Priority | None = None,
    ) -> list[Task]:
        """Lista tarefas aplicando os filtros informados."""
        return self._repository.list(status=status, priority=priority)

    def get(self, task_id: int) -> Task:
        """Busca uma tarefa.

        Raises:
            TaskNotFoundError: Se a tarefa nao existir.
        """
        task = self._repository.get(task_id)
        if task is None:
            raise TaskNotFoundError(task_id)
        return task

    def update(self, task_id: int, data: TaskUpdate) -> Task:
        """Aplica alteracoes parciais a uma tarefa.

        Raises:
            TaskNotFoundError: Se a tarefa nao existir.
            BusinessRuleError: Se o resultado ficar recorrente sem vencimento.
        """
        current = self.get(task_id)
        changes = data.model_dump(exclude_unset=True)
        updated = current.model_copy(update=changes)

        if updated.recurrence is not Recurrence.NENHUMA and updated.due_date is None:
            raise BusinessRuleError(
                "Uma tarefa recorrente precisa de data de vencimento. "
                "Informe uma data ou remova a recorrencia."
            )

        self._repository.update(updated)
        return updated

    def complete(self, task_id: int) -> CompletionResult:
        """Conclui uma tarefa e, se ela for recorrente, agenda a proxima.

        Raises:
            TaskNotFoundError: Se a tarefa nao existir.
            BusinessRuleError: Se a tarefa ja estiver concluida.
        """
        task = self.get(task_id)
        if task.status is Status.CONCLUIDA:
            raise BusinessRuleError(
                f"A tarefa {task_id} ja esta concluida. "
                "Reabra-a antes de concluir novamente."
            )

        completed = task.model_copy(
            update={"status": Status.CONCLUIDA, "completed_at": self._now()}
        )
        self._repository.update(completed)

        return CompletionResult(
            task=completed,
            next_occurrence=self._schedule_next_occurrence(task),
        )

    def reopen(self, task_id: int) -> Task:
        """Devolve uma tarefa concluida ao estado pendente.

        Raises:
            TaskNotFoundError: Se a tarefa nao existir.
            BusinessRuleError: Se a tarefa ja estiver pendente.
        """
        task = self.get(task_id)
        if task.status is Status.PENDENTE:
            raise BusinessRuleError(f"A tarefa {task_id} ja esta pendente.")

        reopened = task.model_copy(
            update={"status": Status.PENDENTE, "completed_at": None}
        )
        self._repository.update(reopened)
        return reopened

    def delete(self, task_id: int) -> None:
        """Remove uma tarefa definitivamente.

        Raises:
            TaskNotFoundError: Se a tarefa nao existir.
        """
        if not self._repository.delete(task_id):
            raise TaskNotFoundError(task_id)

    def _schedule_next_occurrence(self, completed_task: Task) -> Task | None:
        """Cria a proxima ocorrencia de uma tarefa recorrente, se houver."""
        if completed_task.recurrence is Recurrence.NENHUMA:
            return None
        if completed_task.due_date is None:
            raise BusinessRuleError(
                f"A tarefa {completed_task.id} e recorrente mas nao tem "
                "vencimento, entao a proxima ocorrencia nao pode ser calculada."
            )

        next_task = completed_task.model_copy(
            update={
                "id": UNSAVED_TASK_ID,
                "due_date": next_due_date(
                    completed_task.due_date, completed_task.recurrence
                ),
                "status": Status.PENDENTE,
                "created_at": self._now(),
                "completed_at": None,
            }
        )
        return self._repository.add(next_task)
