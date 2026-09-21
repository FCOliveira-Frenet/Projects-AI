"""Conexao e schema do banco SQLite."""

from __future__ import annotations

import sqlite3
from pathlib import Path

IN_MEMORY = ":memory:"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    due_date     TEXT,
    priority     TEXT    NOT NULL CHECK (priority IN ('baixa', 'media', 'alta')),
    status       TEXT    NOT NULL CHECK (status IN ('pendente', 'concluida')),
    recurrence   TEXT    NOT NULL CHECK (
                             recurrence IN ('nenhuma', 'diaria', 'semanal', 'mensal')
                         ),
    created_at   TEXT    NOT NULL,
    completed_at TEXT,
    CHECK (recurrence = 'nenhuma' OR due_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks (status, due_date);
"""


def connect(db_path: str | Path) -> sqlite3.Connection:
    """Abre uma conexao com o banco, criando o arquivo e o diretorio se preciso.

    Args:
        db_path: Caminho do arquivo do banco, ou `IN_MEMORY` para banco volatil.

    Returns:
        Conexao configurada com acesso as colunas por nome.
    """
    if str(db_path) != IN_MEMORY:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    # check_same_thread=False porque o uvicorn atende requisicoes em threads
    # distintas; a serializacao dos acessos fica por conta do proprio SQLite.
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_schema(connection: sqlite3.Connection) -> None:
    """Cria as tabelas e indices caso ainda nao existam."""
    connection.executescript(_SCHEMA)
    connection.commit()
