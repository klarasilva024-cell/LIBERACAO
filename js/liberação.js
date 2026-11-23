const API_FILA = "api/buscar_fila.php";
const API_LIBERAR = "api/liberar_turma.php";
const API_USUARIO = "api/usuario_logado.php";

let dadosFila = [];
let enviando = false;

/* =========================================
   CARREGAR DADOS DO USUÁRIO LOGADO
========================================= */

async function carregarUsuario() {
    try {
        const resposta = await fetch(API_USUARIO, {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin"
        });

        const usuario = await resposta.json();

        if (!resposta.ok || !usuario.sucesso) {
            throw new Error(
                usuario.mensagem || "Não foi possível identificar o usuário."
            );
        }

        // Nome do usuário
        const elementoNome = document.getElementById("user-name");

        if (elementoNome) {
            elementoNome.textContent = usuario.nome;
        }

        // Iniciais do usuário
        const iniciais = usuario.nome
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(palavra => palavra.charAt(0))
            .join("")
            .toUpperCase();

        const elementoAvatar = document.getElementById("user-avatar");

        if (elementoAvatar) {
            elementoAvatar.textContent = iniciais || "--";
        }

        // Cargo do usuário
        const elementoCargo = document.getElementById("user-role");

        if (elementoCargo) {
            elementoCargo.textContent = usuario.cargo;
        }

    } catch (erro) {
        console.error("Erro ao carregar usuário:", erro);

        const elementoNome = document.getElementById("user-name");
        const elementoAvatar = document.getElementById("user-avatar");

        if (elementoNome) {
            elementoNome.textContent = "Usuário não identificado";
        }

        if (elementoAvatar) {
            elementoAvatar.textContent = "--";
        }
    }
}

/* =========================================
   CARREGAR FILA
========================================= */

async function carregarFila() {
    try {
        const resposta = await fetch(API_FILA, {
            method: "GET",
            cache: "no-store"
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Não foi possível carregar a fila."
            );
        }

        dadosFila = Array.isArray(dados.turmas)
            ? dados.turmas.sort((a, b) => a.ordem - b.ordem)
            : [];

        const titulo = document.querySelector(".section-title");

        if (titulo) {
            titulo.textContent =
                `Fila de Liberação por Série — Ciclo ${dados.ciclo || ''}`;
        }

        renderizarFilas();
        atualizarIndicadores();

    } catch (erro) {
        console.error("Erro ao carregar fila:", erro);
    }
}

/* =========================================
   FORMATAR SÉRIE
========================================= */

function formatarSerie(serie) {
    return String(serie)
        .replace(/º/g, "ª")
        .replace(/^([123])ª([AB])$/i, "$1ª $2");
}

/* =========================================
   LOCALIZAR COLUNA DA SÉRIE
========================================= */

function obterColuna(serie) {
    const numero = String(serie).match(/[123]/)?.[0];

    if (!numero) return null;

    return [...document.querySelectorAll(".queue-column")]
        .find(coluna =>
            coluna.dataset.serie.startsWith(numero + "ª")
        );
}

/* =========================================
   MOSTRAR TURMAS NA TELA
========================================= */

function renderizarFilas() {
    document.querySelectorAll(".class-list").forEach(lista => {
        lista.innerHTML = "";
    });

    dadosFila.forEach(turma => {
        const coluna = obterColuna(turma.serie);

        if (!coluna) {
            console.error("Série não encontrada:", turma.serie);
            return;
        }

        const lista = coluna.querySelector(".class-list");

        if (!lista) return;

        const linha = document.createElement("div");
        linha.className = "class-row";

        if (turma.liberada) {
            linha.classList.add("released");
        }

        const informacoes = document.createElement("div");
        informacoes.className = "row-info";

        const horario = document.createElement("span");
        horario.className = "time";

        horario.textContent = turma.horario_liberacao
            ? turma.horario_liberacao.substring(11, 16)
            : "--:--";

        const nome = document.createElement("span");
        nome.className = "class-name";

        nome.textContent =
            `${formatarSerie(turma.serie)} ${turma.nome_turma}`;

        informacoes.appendChild(horario);
        informacoes.appendChild(nome);

        const acoes = document.createElement("div");
        acoes.className = "action-group";

        if (turma.liberada) {
            const status = document.createElement("span");

            status.className = "status-badge released";
            status.textContent = "Liberada";

            acoes.appendChild(status);

        } else {
            const status = document.createElement("span");

            status.className = "status-badge";
            status.textContent = "Aguardando";

            const botao = document.createElement("button");

            botao.type = "button";
            botao.className = "btn-liberar";
            botao.textContent = "Liberar";

            botao.addEventListener("click", () => {
                liberarTurma(turma.id_turma, botao);
            });

            acoes.appendChild(status);
            acoes.appendChild(botao);
        }

        linha.appendChild(informacoes);
        linha.appendChild(acoes);

        lista.appendChild(linha);
    });
}

/* =========================================
   LIBERAR TURMA
========================================= */

async function liberarTurma(idTurma, botao) {
    if (enviando) return;

    enviando = true;

    botao.disabled = true;
    botao.textContent = "Liberando...";

    try {
        const formulario = new URLSearchParams();

        formulario.append("id_turma", idTurma);

        const resposta = await fetch(API_LIBERAR, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: formulario.toString(),
            credentials: "same-origin"
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem || "Não foi possível liberar a turma."
            );
        }

        await carregarFila();

    } catch (erro) {
        console.error("Erro ao liberar turma:", erro);
        alert(erro.message);

        botao.disabled = false;
        botao.textContent = "Liberar";

    } finally {
        enviando = false;
    }
}

/* =========================================
   ATUALIZAR INDICADORES
========================================= */

function atualizarIndicadores() {
    const totalTurmas = dadosFila.length;

    const liberadas = dadosFila.filter(
        turma => turma.liberada
    );

    const aguardando = totalTurmas - liberadas.length;

    const indicadorAguardando =
        document.getElementById("kpi-aguardando");

    const indicadorRealizadas =
        document.getElementById("kpi-realizadas");

    const indicadorUltima =
        document.getElementById("kpi-ultima-liberada");

    const indicadorProxima =
        document.getElementById("kpi-proxima");

    if (indicadorAguardando) {
        indicadorAguardando.textContent = aguardando;
    }

    if (indicadorRealizadas) {
        indicadorRealizadas.textContent =
            `${liberadas.length}/${totalTurmas}`;
    }

    const ultima = [...liberadas].sort((a, b) => {
        return new Date(b.horario_liberacao) -
               new Date(a.horario_liberacao);
    })[0];

    if (indicadorUltima) {
        indicadorUltima.textContent = ultima
            ? `${formatarSerie(ultima.serie)} ${ultima.nome_turma}`
            : "Nenhuma";
    }

    const proxima = dadosFila.find(
        turma => !turma.liberada
    );

    if (indicadorProxima) {
        indicadorProxima.textContent = proxima
            ? `${formatarSerie(proxima.serie)} ${proxima.nome_turma}`
            : "Todas liberadas";
    }
}

/* =========================================
   NAVEGAÇÃO
========================================= */

function navegarPara(acao) {
    if (acao === "voltar") {
        window.location.href = "index.html";

    } else if (acao === "sair") {
        alert("Sessão encerrada com sucesso.");
        window.location.href = "index.html";
    }
}

/* =========================================
   INICIAR SISTEMA
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    carregarUsuario();
    carregarFila();

    // Atualiza a fila automaticamente a cada 10 segundos
    setInterval(carregarFila, 10000);
});