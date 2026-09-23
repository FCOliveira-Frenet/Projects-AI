# Dashboard SLA de Entregas — J&T Express

Painel web para análise do cumprimento de **SLA de entregas** da transportadora
**J&T Express**. A interface é 100% em português (pt-BR) e apresenta indicadores,
séries temporais e distribuição de status a partir de uma base real de entregas.

O dashboard tem **três abas**, todas alimentadas pela mesma planilha do Google
Sheets:

1. **SLA Detalhado** — análise por dia/hora a partir da aba `Base SLA J&T`.
2. **Base Geral (semanal)** — SLA consolidado por semana a partir da aba `Base Geral`.
3. **SLA Semanal (diário)** — SLA médio por dia, com número da semana, a partir da
   aba `Base_sla_semanal`.

## O que o dashboard mostra

### Aba SLA Detalhado

- **KPIs**: SLA médio geral, total de entregas, entregas no prazo, fora do prazo,
  parciais e registros sem informação de SLA.
- **SLA por hora**: série temporal com a taxa média de cumprimento por hora ao
  longo de todo o período analisado.
- **Distribuição de status**: donut com a participação de cada status (no prazo /
  parcial / fora do prazo / sem info).
- **Volume de entregas por dia**: total de entregas registradas em cada dia.
- **Comparativo de SLA por dia**: barras coloridas por desempenho
  (verde ≥ 80%, âmbar 60–80%, vermelho < 60%).
- **Destaques**: melhor e pior dia, e as horas mais críticas.

### Aba Base Geral (semanal)

- **KPIs semanais**: SLA geral consolidado, nº de semanas, melhor e pior semana.
- **SLA médio por semana**: barras coloridas por desempenho.
- **Detalhamento**: tabela com o SLA de cada semana e o total geral.

### Aba SLA Semanal (diário)

- **KPIs**: SLA médio do período, último dia registrado, melhor e pior dia.
- **SLA por dia**: gráfico de tendência diária.
- **Médias por semana** e **detalhamento diário** (data, dia, semana, SLA).

## Como o SLA é interpretado

A coluna `SLA de Entrega` é uma nota no intervalo `[0, 1]`:

- `1.0` → entregue **no prazo**
- `0.0` → **fora do prazo**
- valores fracionários (`0.5`, `0.667`, …) → entrega **parcial**
- células **em branco** → **sem informação**: são contabilizadas no total, mas
  **excluídas** do cálculo das taxas.

## Arquitetura de dados

O dashboard é **alimentado pelo Google Sheets** (a mesma planilha para as duas
abas). O arquivo bruto **não é enviado ao navegador**: um script de
pré-processamento baixa a planilha, calcula KPIs/séries e grava um JSON derivado
que o app importa em tempo de build.

- **Fonte online**: [Google Sheets](https://docs.google.com/spreadsheets/d/1Q1eHkc7o47OXP8U8U51vlyXPaH5BHe1LC_1fXlOaM50)
  (abas `Base SLA J&T`, `Base Geral` e `Base_sla_semanal`).
- **Script**: [`scripts/build_analytics.py`](scripts/build_analytics.py)
- **Cache local** (reprodutibilidade): [`data/Base_SLA_J_T.xlsx`](data/Base_SLA_J_T.xlsx)
- **Saída**: `src/data/analytics.json` (versionada no repositório).

Regerar as métricas:

```bash
npm run build:data                       # baixa direto do Google Sheets
python3 scripts/build_analytics.py --local   # usa o cache em data/
python3 scripts/build_analytics.py caminho.xlsx   # usa um arquivo específico
```

O script requer `openpyxl` (`pip install openpyxl`) e acesso à internet para o
modo online (com fallback automático para o cache local).

## Rodando localmente

Pré-requisitos: Node.js 18+ e npm.

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 43217
```

Acesse http://localhost:43217

Outros comandos:

```bash
npm run build   # build de produção
npm run start   # servir o build de produção
npm run lint    # checagem de lint
```

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) para os gráficos
- [openpyxl](https://openpyxl.readthedocs.io/) para o pré-processamento da base
