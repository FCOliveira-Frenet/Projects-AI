"""Rotas HTTP do controle de tarefas.

As funcoes deste modulo apenas traduzem HTTP para chamadas de servico: nenhuma
regra de negocio e decidida aqui.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.models import (
    CompletionResult,
    Priority,
    Status,
    Task,
    TaskCreate,
    TaskUpdate,
)
from app.service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["tarefas"])


def get_service(request: Request) -> TaskService:
    """Recupera o servico montado no ciclo de vida da aplicacao."""
    return request.app.state.task_service


ServiceDep = Annotated[TaskService, Depends(get_service)]


@router.post("", response_model=Task, status_code=HTTPStatus.CREATED)
def create_task(data: TaskCreate, service: ServiceDep) -> Task:
    """Cria uma nova tarefa pendente."""
    return service.create(data)


@router.get("", response_model=list[Task])
def list_tasks(
    service: ServiceDep,
    status: Annotated[Status | None, Query(description="Filtra por status")] = None,
    priority: Annotated[
        Priority | None, Query(description="Filtra por prioridade")
    ] = None,
) -> list[Task]:
    """Lista tarefas, das mais urgentes para as menos urgentes."""
    return service.list(status=status, priority=priority)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int, service: ServiceDep) -> Task:
    """Retorna uma tarefa especifica."""
    return service.get(task_id)


@router.patch("/{task_id}", response_model=Task)
def update_task(task_id: int, data: TaskUpdate, service: ServiceDep) -> Task:
    """Altera parcialmente uma tarefa."""
    return service.update(task_id, data)


@router.post("/{task_id}/complete", response_model=CompletionResult)
def complete_task(task_id: int, service: ServiceDep) -> CompletionResult:
    """Conclui uma tarefa e agenda a proxima ocorrencia, se for recorrente."""
    return service.complete(task_id)


@router.post("/{task_id}/reopen", response_model=Task)
def reopen_task(task_id: int, service: ServiceDep) -> Task:
    """Devolve uma tarefa concluida ao estado pendente."""
    return service.reopen(task_id)


@router.delete("/{task_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_task(task_id: int, service: ServiceDep) -> None:
    """Remove uma tarefa definitivamente."""
    service.delete(task_id)
