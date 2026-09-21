/**
 * Interface do controle pessoal de tarefas.
 *
 * A lista completa e carregada do servidor e os filtros de exibicao sao
 * aplicados aqui, para que o resumo do topo continue refletindo o total real
 * de tarefas mesmo com um filtro ativo.
 */

const API_TASKS = "/api/tasks";

const ROTULO_PRIORIDADE = { baixa: "Baixa", media: "Média", alta: "Alta" };
const ROTULO_RECORRENCIA = {
  diaria: "Repete diariamente",
  semanal: "Repete semanalmente",
  mensal: "Repete mensalmente",
};

const estado = { tarefas: [], status: "", prioridade: "", editandoId: null };

const elementos = {
  formulario: document.getElementById("formulario"),
  titulo: document.getElementById("campo-titulo"),
  descricao: document.getElementById("campo-descricao"),
  vencimento: document.getElementById("campo-vencimento"),
  prioridade: document.getElementById("campo-prioridade"),
  recorrencia: document.getElementById("campo-recorrencia"),
  tituloFormulario: document.getElementById("titulo-formulario"),
  botaoSalvar: document.getElementById("botao-salvar"),
  botaoCancelar: document.getElementById("botao-cancelar"),
  filtroPrioridade: document.getElementById("filtro-prioridade"),
  lista: document.getElementById("lista"),
  listaVazia: document.getElementById("lista-vazia"),
  aviso: document.getElementById("aviso"),
  modelo: document.getElementById("modelo-tarefa"),
  resumo: {
    pendentes: document.getElementById("resumo-pendentes"),
    atrasadas: document.getElementById("resumo-atrasadas"),
    concluidas: document.getElementById("resumo-concluidas"),
  },
};

/** Data de hoje no fuso local, no mesmo formato ISO usado pela API. */
function hojeIso() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Converte "2026-03-10" em "10/03/2026" sem passar por fuso horario. */
function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function extrairMensagemDeErro(corpo, status) {
  if (corpo?.error?.message) return corpo.error.message;
  if (Array.isArray(corpo?.detail)) {
    return corpo.detail.map((item) => item.msg).join(" ");
  }
  if (typeof corpo?.detail === "string") return corpo.detail;
  return `Não foi possível concluir a operação (HTTP ${status}).`;
}

async function requisitar(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (resposta.status === 204) return null;

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(extrairMensagemDeErro(corpo, resposta.status));
  return corpo;
}

function avisar(mensagem, tipo = "erro") {
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.toggle("feedback--ok", tipo === "ok");
  elementos.aviso.classList.remove("is-hidden");
}

function limparAviso() {
  elementos.aviso.classList.add("is-hidden");
}

function tarefasVisiveis() {
  return estado.tarefas.filter((tarefa) => {
    const statusOk = !estado.status || tarefa.status === estado.status;
    const prioridadeOk =
      !estado.prioridade || tarefa.priority === estado.prioridade;
    return statusOk && prioridadeOk;
  });
}

function estaAtrasada(tarefa) {
  return (
    tarefa.status === "pendente" && tarefa.due_date && tarefa.due_date < hojeIso()
  );
}

function atualizarResumo() {
  const pendentes = estado.tarefas.filter((t) => t.status === "pendente");
  elementos.resumo.pendentes.textContent = pendentes.length;
  elementos.resumo.atrasadas.textContent = pendentes.filter(estaAtrasada).length;
  elementos.resumo.concluidas.textContent =
    estado.tarefas.length - pendentes.length;
}

function preencherVencimento(elemento, tarefa) {
  if (!tarefa.due_date) {
    elemento.classList.add("is-hidden");
    return;
  }
  const atrasada = estaAtrasada(tarefa);
  elemento.textContent = atrasada
    ? `Venceu em ${formatarData(tarefa.due_date)}`
    : `Vence em ${formatarData(tarefa.due_date)}`;
  elemento.classList.toggle("badge--atrasada", atrasada);
}

function montarItem(tarefa) {
  const item = elementos.modelo.content.firstElementChild.cloneNode(true);
  item.dataset.id = tarefa.id;
  item.classList.toggle("task--done", tarefa.status === "concluida");

  // textContent (e nao innerHTML) para que o conteudo digitado pelo usuario
  // nunca seja interpretado como HTML.
  item.querySelector(".task-title").textContent = tarefa.title;

  const descricao = item.querySelector(".task-description");
  descricao.textContent = tarefa.description;
  descricao.classList.toggle("is-hidden", !tarefa.description);

  const prioridade = item.querySelector(".badge--priority");
  prioridade.textContent = ROTULO_PRIORIDADE[tarefa.priority];
  prioridade.classList.add(`badge--${tarefa.priority}`);

  preencherVencimento(item.querySelector(".badge--due"), tarefa);

  const recorrencia = item.querySelector(".badge--recurrence");
  const rotuloRecorrencia = ROTULO_RECORRENCIA[tarefa.recurrence];
  recorrencia.textContent = rotuloRecorrencia ?? "";
  recorrencia.classList.toggle("is-hidden", !rotuloRecorrencia);

  return item;
}

function renderizar() {
  const visiveis = tarefasVisiveis();
  elementos.lista.replaceChildren(...visiveis.map(montarItem));
  elementos.listaVazia.classList.toggle("is-hidden", visiveis.length > 0);
  atualizarResumo();
}

async function carregarTarefas() {
  try {
    estado.tarefas = await requisitar(API_TASKS);
    renderizar();
  } catch (erro) {
    avisar(`Falha ao carregar as tarefas: ${erro.message}`);
  }
}

function lerFormulario() {
  return {
    title: elementos.titulo.value.trim(),
    description: elementos.descricao.value.trim(),
    due_date: elementos.vencimento.value || null,
    priority: elementos.prioridade.value,
    recurrence: elementos.recorrencia.value,
  };
}

/** Validacoes que o servidor tambem faz, antecipadas para dar retorno imediato. */
function erroDeValidacao(dados) {
  if (!dados.title) return "Informe um título para a tarefa.";
  if (dados.recurrence !== "nenhuma" && !dados.due_date) {
    return "Tarefas recorrentes precisam de uma data de vencimento.";
  }
  return null;
}

function sairDoModoEdicao() {
  estado.editandoId = null;
  elementos.formulario.reset();
  elementos.tituloFormulario.textContent = "Nova tarefa";
  elementos.botaoSalvar.textContent = "Adicionar tarefa";
  elementos.botaoCancelar.classList.add("is-hidden");
}

function entrarNoModoEdicao(tarefa) {
  estado.editandoId = tarefa.id;
  elementos.titulo.value = tarefa.title;
  elementos.descricao.value = tarefa.description;
  elementos.vencimento.value = tarefa.due_date ?? "";
  elementos.prioridade.value = tarefa.priority;
  elementos.recorrencia.value = tarefa.recurrence;
  elementos.tituloFormulario.textContent = `Editando: ${tarefa.title}`;
  elementos.botaoSalvar.textContent = "Salvar alterações";
  elementos.botaoCancelar.classList.remove("is-hidden");
  elementos.titulo.focus();
  elementos.formulario.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function enviarFormulario(evento) {
  evento.preventDefault();
  limparAviso();

  const dados = lerFormulario();
  const problema = erroDeValidacao(dados);
  if (problema) {
    avisar(problema);
    return;
  }

  const emEdicao = estado.editandoId !== null;
  try {
    await requisitar(emEdicao ? `${API_TASKS}/${estado.editandoId}` : API_TASKS, {
      method: emEdicao ? "PATCH" : "POST",
      body: JSON.stringify(dados),
    });
    sairDoModoEdicao();
    await carregarTarefas();
    avisar(emEdicao ? "Tarefa atualizada." : "Tarefa adicionada.", "ok");
  } catch (erro) {
    avisar(erro.message);
  }
}

async function alternarConclusao(tarefa) {
  const acao = tarefa.status === "pendente" ? "complete" : "reopen";
  const resultado = await requisitar(`${API_TASKS}/${tarefa.id}/${acao}`, {
    method: "POST",
  });

  if (resultado?.next_occurrence) {
    const proxima = formatarData(resultado.next_occurrence.due_date);
    avisar(`Tarefa concluída. Próxima ocorrência agendada para ${proxima}.`, "ok");
  } else {
    limparAviso();
  }
}

async function excluir(tarefa) {
  const confirmado = window.confirm(`Excluir definitivamente "${tarefa.title}"?`);
  if (!confirmado) return false;

  await requisitar(`${API_TASKS}/${tarefa.id}`, { method: "DELETE" });
  if (estado.editandoId === tarefa.id) sairDoModoEdicao();
  return true;
}

async function tratarCliqueNaLista(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  const id = Number(botao.closest(".task").dataset.id);
  const tarefa = estado.tarefas.find((item) => item.id === id);
  if (!tarefa) return;

  try {
    if (botao.dataset.acao === "editar") {
      entrarNoModoEdicao(tarefa);
      return;
    }
    if (botao.dataset.acao === "excluir" && !(await excluir(tarefa))) return;
    if (botao.dataset.acao === "alternar") await alternarConclusao(tarefa);
    await carregarTarefas();
  } catch (erro) {
    avisar(erro.message);
  }
}

function tratarCliqueNasAbas(evento) {
  const aba = evento.target.closest(".tab");
  if (!aba) return;

  estado.status = aba.dataset.status;
  document
    .querySelectorAll(".tab")
    .forEach((item) => item.classList.toggle("is-active", item === aba));
  renderizar();
}

elementos.formulario.addEventListener("submit", enviarFormulario);
elementos.botaoCancelar.addEventListener("click", sairDoModoEdicao);
elementos.lista.addEventListener("click", tratarCliqueNaLista);
document.querySelector(".tabs").addEventListener("click", tratarCliqueNasAbas);
elementos.filtroPrioridade.addEventListener("change", (evento) => {
  estado.prioridade = evento.target.value;
  renderizar();
});

carregarTarefas();
