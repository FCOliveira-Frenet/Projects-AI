"""Acesso a dados das tarefas.

Esta camada so traduz entre linhas do SQLite e objetos `Task`. Nenhuma regra
de negocio mora aqui, o que permite substitui-la por um duble nos testes.
"""

from __future__ import annotations

import sqlite3
from datetime import date, datetime

from app.models import Priority, Recurrence, Status, Task

_COLUMNS = (
    "id, title, description, due_date, priority, status, "
    "recurrence, created_at, completed_at"
)

# Pendentes primeiro, depois as mais proximas de vencer; tarefas sem data
# ficam ao final do grupo e a prioridade decide empates.
_ORDER_BY = """
ORDER BY
    CASE status WHEN 'pendente' THEN 0 ELSE 1 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date,
    CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
    id
"""


class TaskRepository:
    """Repositorio de tarefas sobre uma conexao SQLite."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def add(self, task: Task) -> Task:
        """Insere uma tarefa e devolve a versao persistida, com o id gerado.

        O campo `id` do argumento e ignorado: quem define o identificador e o
        banco.
        """
        cursor = self._connection.execute(
            """
            INSERT INTO tasks (
                title, description, due_date, priority,
                status, recurrence, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task.title,
                task.description,
                _date_to_db(task.due_date),
                task.priority.value,
                task.status.value,
                task.recurrence.value,
                task.created_at.isoformat(),
                _datetime_to_db(task.completed_at),
            ),
        )
        self._connection.commit()
        return task.model_copy(update={"id": int(cursor.lastrowid)})

    def get(self, task_id: int) -> Task | None:
        """Busca uma tarefa pelo id, ou `None` se ela nao existir."""
        row = self._connection.execute(
            f"SELECT {_COLUMNS} FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return None if row is None else _row_to_task(row)

    def list(
        self,
        status: Status | None = None,
        priority: Priority | None = None,
    ) -> list[Task]:
        """Lista tarefas, opcionalmente filtrando por status e/ou prioridade."""
        filters: list[str] = []
        parameters: list[str] = []

        if status is not None:
            filters.append("status = ?")
            parameters.append(status.value)
        if priority is not None:
            filters.append("priority = ?")
            parameters.append(priority.value)

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        rows = self._connection.execute(
            f"SELECT {_COLUMNS} FROM tasks {where_clause} {_ORDER_BY}",
            tuple(parameters),
        ).fetchall()
        return [_row_to_task(row) for row in rows]

    def update(self, task: Task) -> None:
        """Sobrescreve uma tarefa existente com o estado recebido.

        Raises:
            LookupError: Se nenhuma linha corresponder ao id informado.
        """
        cursor = self._connection.execute(
            """
            UPDATE tasks
               SET title = ?, description = ?, due_date = ?, priority = ?,
                   status = ?, recurrence = ?, completed_at = ?
             WHERE id = ?
            """,
            (
                task.title,
                task.description,
                _date_to_db(task.due_date),
                task.priority.value,
                task.status.value,
                task.recurrence.value,
                _datetime_to_db(task.completed_at),
                task.id,
            ),
        )
        self._connection.commit()
        if cursor.rowcount == 0:
            raise LookupError(f"Nenhuma tarefa com id {task.id} para atualizar.")

    def delete(self, task_id: int) -> bool:
        """Remove uma tarefa. Retorna `True` se algo foi de fato removido."""
        cursor = self._connection.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        self._connection.commit()
        return cursor.rowcount > 0


def _date_to_db(value: date | None) -> str | None:
    return None if value is None else value.isoformat()


def _datetime_to_db(value: datetime | None) -> str | None:
    return None if value is None else value.isoformat()


def _row_to_task(row: sqlite3.Row) -> Task:
    return Task(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        due_date=date.fromisoformat(row["due_date"]) if row["due_date"] else None,
        priority=Priority(row["priority"]),
        status=Status(row["status"]),
        recurrence=Recurrence(row["recurrence"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        completed_at=(
            datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None
        ),
    )
