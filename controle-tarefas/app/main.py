"""Montagem da aplicacao: configuracao, ciclo de vida, erros e rotas."""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from http import HTTPStatus
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import db
from app.api import router as tasks_router
from app.repository import TaskRepository
from app.service import BusinessRuleError, TaskNotFoundError, TaskService

SERVICE_NAME = "controle-tarefas"
DB_PATH_ENV_VAR = "CONTROLE_DB_PATH"
LOG_LEVEL_ENV_VAR = "CONTROLE_LOG_LEVEL"

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DB_PATH = _PROJECT_ROOT / "data" / "tarefas.db"
_STATIC_DIR = _PROJECT_ROOT / "static"

logger = logging.getLogger(SERVICE_NAME)


class JsonLogFormatter(logging.Formatter):
    """Formata cada registro como uma linha JSON, facil de filtrar e agregar."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "service": SERVICE_NAME,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """Direciona os logs da aplicacao para a saida padrao em formato JSON."""
    level_name = os.getenv(LOG_LEVEL_ENV_VAR, "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)


def resolve_db_path() -> Path:
    """Decide onde o banco fica, permitindo sobrescrita por variavel de ambiente.

    Um valor em branco e tratado como ausente, evitando que uma variavel
    definida por engano aponte o banco para um caminho invalido.
    """
    configured = os.getenv(DB_PATH_ENV_VAR, "").strip()
    return Path(configured).expanduser() if configured else _DEFAULT_DB_PATH


def _error_response(status: HTTPStatus, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status, content={"error": {"code": code, "message": message}}
    )


def _register_error_handlers(app: FastAPI) -> None:
    """Traduz erros de dominio em respostas HTTP previsiveis."""

    @app.exception_handler(TaskNotFoundError)
    async def _handle_not_found(_: Request, exc: TaskNotFoundError) -> JSONResponse:
        logger.info("Tarefa nao encontrada: id=%s", exc.task_id)
        return _error_response(HTTPStatus.NOT_FOUND, "tarefa_nao_encontrada", str(exc))

    @app.exception_handler(BusinessRuleError)
    async def _handle_business_rule(_: Request, exc: BusinessRuleError) -> JSONResponse:
        logger.info("Regra de negocio violada: %s", exc)
        return _error_response(HTTPStatus.CONFLICT, "regra_de_negocio", str(exc))

    @app.exception_handler(sqlite3.Error)
    async def _handle_database_error(
        request: Request, exc: sqlite3.Error
    ) -> JSONResponse:
        # A causa real fica no log; a resposta nao expoe detalhes internos.
        logger.exception("Falha de banco em %s %s", request.method, request.url.path)
        return _error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR,
            "falha_de_persistencia",
            "Nao foi possivel acessar o banco de dados. "
            "Tente novamente; se persistir, consulte os logs do servidor.",
        )


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Abre a conexao com o banco na subida e a fecha no encerramento."""
    db_path = resolve_db_path()
    connection = db.connect(db_path)
    db.init_schema(connection)
    app.state.task_service = TaskService(TaskRepository(connection))
    logger.info("Aplicacao iniciada usando o banco em %s", db_path)
    try:
        yield
    finally:
        connection.close()
        logger.info("Conexao com o banco encerrada.")


def create_app() -> FastAPI:
    """Cria a aplicacao FastAPI com rotas, erros e interface web."""
    configure_logging()

    app = FastAPI(
        title="Controle pessoal de tarefas",
        description="Gerenciador local de tarefas com prazos, prioridades e "
        "recorrencia.",
        version="1.0.0",
        lifespan=_lifespan,
    )

    _register_error_handlers(app)
    app.include_router(tasks_router)

    if not _STATIC_DIR.is_dir():
        raise RuntimeError(
            f"Diretorio da interface nao encontrado em {_STATIC_DIR}. "
            "Verifique se a pasta 'static' acompanha o projeto."
        )

    # Montado por ultimo para nao capturar as rotas de /api.
    # Sem CORS: a interface e servida pela mesma origem da API.
    app.mount("/", StaticFiles(directory=_STATIC_DIR, html=True), name="interface")
    return app


app = create_app()
