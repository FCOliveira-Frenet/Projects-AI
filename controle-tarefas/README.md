# Controle pessoal de tarefas

Gerenciador local de tarefas com prazos, prioridades e recorrência. Roda
inteiramente na sua máquina: um servidor em `localhost` entrega a interface web
e a API, e os dados ficam em um único arquivo SQLite.

Não há login nem acesso pela rede — o servidor escuta apenas em `127.0.0.1`.

## Requisitos

- Python 3.13 (já instalado nesta máquina em
  `%LOCALAPPDATA%\Programs\Python\Python313`)

## Instalação

A partir da pasta do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> O ambiente virtual já existe em `.venv/` com as dependências instaladas.
> Se o comando `python` não for reconhecido, feche e reabra o terminal para que
> ele recarregue o PATH, ou use o caminho completo
> `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`.

## Como executar

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Depois abra <http://127.0.0.1:8000> no navegador.

Para encerrar, pressione `Ctrl+C` no terminal. Se o servidor tiver sido iniciado
em segundo plano, encerre o processo `python.exe` correspondente — matar apenas
o terminal que o iniciou não derruba o servidor.

## Testes

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Os testes cobrem o cálculo de recorrência e as regras de negócio do serviço,
usando um banco SQLite em memória e um relógio fixo, sem tocar no seu banco real.

## Onde ficam os dados

Por padrão em `data/tarefas.db`. Para fazer backup, basta copiar esse arquivo.
A pasta `data/` está no `.gitignore` para que suas tarefas nunca sejam versionadas.

Para usar outro caminho, defina a variável de ambiente `CONTROLE_DB_PATH`:

```powershell
$env:CONTROLE_DB_PATH = "D:\backup\tarefas.db"
```

O nível de log pode ser ajustado com `CONTROLE_LOG_LEVEL` (padrão `INFO`).
Os logs saem em JSON, uma linha por evento.

## Estrutura

| Arquivo             | Responsabilidade                                      |
| ------------------- | ----------------------------------------------------- |
| `app/models.py`     | Modelos e validação de entrada                        |
| `app/recurrence.py` | Cálculo da próxima ocorrência (lógica pura)           |
| `app/repository.py` | Leitura e escrita no SQLite                           |
| `app/service.py`    | Regras de negócio e erros de domínio                  |
| `app/api.py`        | Rotas HTTP                                            |
| `app/main.py`       | Configuração, ciclo de vida e tratamento de erros     |
| `static/`           | Interface web servida pelo próprio backend            |

## API

A documentação interativa fica em <http://127.0.0.1:8000/docs> com o servidor no ar.

| Método   | Rota                      | Descrição                                  |
| -------- | ------------------------- | ------------------------------------------ |
| `POST`   | `/api/tasks`              | Cria uma tarefa                            |
| `GET`    | `/api/tasks`              | Lista tarefas (`?status=` e `?priority=`)  |
| `GET`    | `/api/tasks/{id}`         | Consulta uma tarefa                        |
| `PATCH`  | `/api/tasks/{id}`         | Altera campos específicos                  |
| `POST`   | `/api/tasks/{id}/complete`| Conclui e agenda a próxima ocorrência      |
| `POST`   | `/api/tasks/{id}/reopen`  | Reabre uma tarefa concluída                |
| `DELETE` | `/api/tasks/{id}`         | Exclui uma tarefa                          |

Erros retornam `{"error": {"code": ..., "message": ...}}`, com `404` para tarefa
inexistente, `409` para conflito de estado (concluir algo já concluído) e `422`
para dados inválidos.

## Como a recorrência funciona

Uma tarefa recorrente exige data de vencimento. Ao concluí-la, ela é marcada como
concluída e uma nova ocorrência pendente é criada automaticamente.

A próxima data é calculada a partir do vencimento anterior, e não da data de hoje.
Assim, concluir uma tarefa diária atrasada gera o dia seguinte ao vencimento
perdido, em vez de pular dias.

Na recorrência mensal, quando o dia não existe no mês seguinte a data é ajustada
para o último dia daquele mês: 31/01 vira 28/02 (ou 29/02 em ano bissexto). O dia
não volta a subir depois do ajuste, ou seja, a série segue 31/01 → 28/02 → 28/03.

## Limitações conhecidas

- Usuário único e sem autenticação, por decisão de escopo. Não exponha o servidor
  fora de `127.0.0.1` sem antes adicionar controle de acesso.
- Não há categorias, subtarefas nem notificações.
- A interface carrega a lista completa e filtra no navegador, o que é adequado
  para uso pessoal mas não para volumes muito grandes de tarefas.
