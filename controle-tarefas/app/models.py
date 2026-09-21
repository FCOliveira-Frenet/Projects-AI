"""Modelos de dominio e contratos de entrada/saida da API.

Toda validacao de formato (tamanho, obrigatoriedade, valores permitidos)
acontece aqui, na fronteira da aplicacao, para que as camadas internas
possam assumir dados ja validados.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TITLE_MAX_LENGTH = 120
DESCRIPTION_MAX_LENGTH = 2000

# Id provisorio de uma tarefa ainda nao gravada: o valor real e atribuido
# pelo banco no momento da insercao.
UNSAVED_TASK_ID = 0


class Priority(str, Enum):
    """Prioridade de uma tarefa, da menor para a maior urgencia."""

    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class Status(str, Enum):
    """Estado do ciclo de vida de uma tarefa."""

    PENDENTE = "pendente"
    CONCLUIDA = "concluida"


class Recurrence(str, Enum):
    """Periodicidade com que uma tarefa se repete apos ser concluida."""

    NENHUMA = "nenhuma"
    DIARIA = "diaria"
    SEMANAL = "semanal"
    MENSAL = "mensal"


def _normalize_title(value: str) -> str:
    """Remove espacos nas bordas e recusa titulos vazios."""
    normalized = value.strip()
    if not normalized:
        raise ValueError("O titulo nao pode ser vazio.")
    return normalized


class TaskCreate(BaseModel):
    """Dados aceitos para criar uma tarefa."""

    title: str = Field(max_length=TITLE_MAX_LENGTH)
    description: str = Field(default="", max_length=DESCRIPTION_MAX_LENGTH)
    due_date: date | None = None
    priority: Priority = Priority.MEDIA
    recurrence: Recurrence = Recurrence.NENHUMA

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str) -> str:
        return _normalize_title(value)

    @model_validator(mode="after")
    def _validate_recurrence_needs_due_date(self) -> "TaskCreate":
        # A proxima ocorrencia e calculada a partir do vencimento atual;
        # sem uma data de partida a recorrencia nao tem como ser gerada.
        if self.recurrence is not Recurrence.NENHUMA and self.due_date is None:
            raise ValueError(
                "Tarefas recorrentes exigem uma data de vencimento (due_date)."
            )
        return self


class TaskUpdate(BaseModel):
    """Alteracoes parciais de uma tarefa.

    Campos ausentes sao preservados. A coerencia entre `recurrence` e
    `due_date` depende do estado atual da tarefa e por isso e verificada
    no servico, nao aqui.
    """

    title: str | None = Field(default=None, max_length=TITLE_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    due_date: date | None = None
    priority: Priority | None = None
    recurrence: Recurrence | None = None

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str | None) -> str | None:
        return None if value is None else _normalize_title(value)


class Task(BaseModel):
    """Uma tarefa ja persistida."""

    model_config = ConfigDict(frozen=True)

    id: int
    title: str
    description: str
    due_date: date | None
    priority: Priority
    status: Status
    recurrence: Recurrence
    created_at: datetime
    completed_at: datetime | None


class CompletionResult(BaseModel):
    """Resultado de concluir uma tarefa.

    `next_occurrence` so e preenchido quando a tarefa concluida era
    recorrente, caso em que a proxima ocorrencia ja nasce pendente.
    """

    task: Task
    next_occurrence: Task | None = None
