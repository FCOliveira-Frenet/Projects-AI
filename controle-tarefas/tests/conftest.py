"""Fixtures compartilhadas pelos testes."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest

from app import db
from app.repository import TaskRepository
from app.service import TaskService

FIXED_NOW = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def repository() -> Iterator[TaskRepository]:
    """Repositorio sobre um banco em memoria, descartado ao fim do teste."""
    connection = db.connect(db.IN_MEMORY)
    db.init_schema(connection)
    try:
        yield TaskRepository(connection)
    finally:
        connection.close()


@pytest.fixture
def service(repository: TaskRepository) -> TaskService:
    """Servico com relogio fixo, para assercoes deterministicas sobre datas."""
    return TaskService(repository, now=lambda: FIXED_NOW)
