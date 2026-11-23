document.addEventListener("DOMContentLoaded", () => {

    const API_FILA = "./api/buscar_fila.php";
    const API_STATUS = "./api/status_aluno.php";

    /* DADOS DO USUÁRIO / ALUNO */
    let usuarioData = {};
    const tipoUsuario = localStorage.getItem("tipoUsuario");

    try {
        if (tipoUsuario === "professor") {
            usuarioData = JSON.parse(localStorage.getItem("dadosUsuario") || "{}");
        } else {
            usuarioData = JSON.parse(localStorage.getItem("aluno") || "{}");
        }
    } catch (erro) {
        console.error("Erro ao carregar dados do usuário:", erro);
    }

    const profileName = document.getElementById("profileName");
    const welcomeMessage = document.getElementById("welcomeMessage");
    const turmaAluno = document.getElementById("turmaAluno");
    const dataAtual = document.getElementById("dataAtual");
    const statusContainer = document.getElementById("statusContainer");
    const statusBanner = document.getElementById("statusBanner");
    const statusMensagem = document.getElementById("statusMensagem");
    const statusIcon = document.getElementById("statusIcon");
    const logoutButton = document.getElementById("logoutButton");

    const filas = {
        "1": document.getElementById("fila1"),
        "2": document.getElementById("fila2"),
        "3": document.getElementById("fila3")
    };

    /* IDENTIFICAÇÃO DO NOME */
    const nomeUsuario = usuarioData.nome || usuarioData.Nome || "Usuário";

    if (profileName) {
        profileName.textContent = nomeUsuario;
    }

    if (welcomeMessage) {
        welcomeMessage.textContent = `Olá, ${nomeUsuario}!`;
    }

    /* TURMA OU CARGO */
    function obterTurmaOuCargo() {
        if (tipoUsuario === "professor") {
            return "Professor(a)";
        }

        const serie = String(usuarioData.serie || "").trim();
        const turma = String(usuarioData.turma || "").trim();

        if (!serie) return turma;
        if (!turma) return serie;

        if (serie.toLowerCase().includes(turma.toLowerCase())) {
            return serie;
        }

        if (turma.toLowerCase().includes(serie.toLowerCase())) {
            return turma;
        }

        return `${serie} ${turma}`;
    }

    if (turmaAluno) {
        turmaAluno.textContent = obterTurmaOuCargo();
    }

    /* DATA ATUAL */
    function atualizarData() {
        if (!dataAtual) return;

        dataAtual.textContent =
            "Data: " +
            new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });
    }

    atualizarData();

    /* IDENTIFICAR SÉRIE */
    function obterSerie(valor) {
        const texto = String(valor || "").toLowerCase().trim();
        const resultado = texto.match(/(?:^|\D)([123])(?:\D|$)/);

        if (resultado) {
            return resultado[1];
        }

        if (texto.includes("primeira")) return "1";
        if (texto.includes("segunda")) return "2";
        if (texto.includes("terceira")) return "3";

        return null;
    }

    /* VERIFICAR LIBERAÇÃO */
    function estaLiberada(valor) {
        return (
            valor === true ||
            valor === 1 ||
            valor === "1"
        );
    }

    /* FORMATAR HORÁRIO */
    function formatarHorario(valor) {
        if (!valor) {
            return "Aguardando liberação";
        }

        const texto = String(valor);
        const resultado = texto.match(/(\d{2}):(\d{2})/);

        if (resultado) {
            return `${resultado[1]}:${resultado[2]}`;
        }

        return texto;
    }

    /* CRIAR LINHA DA TURMA */
    function criarLinha(turma) {
        const linha = document.createElement("div");
        linha.className = "queue-row";

        const informacoes = document.createElement("div");
        informacoes.className = "time-class";

        const horario = document.createElement("span");
        horario.className = "time";
        horario.textContent = formatarHorario(
            turma.horario_liberacao ||
            turma.horario_previsto ||
            turma.horario
        );

        const nome = document.createElement("span");
        nome.className = "class-name";

        const serie = String(turma.serie || "").trim();
        const curso = String(turma.nome_turma || turma.curso || "").trim();

        if (serie && curso) {
            nome.textContent = `${serie} — ${curso}`;
        } else {
            nome.textContent = serie || curso || "Turma não identificada";
        }

        informacoes.appendChild(horario);
        informacoes.appendChild(nome);

        /* BOTÃO DE STATUS */
        const status = document.createElement("span");
        status.className = "status-badge";

        if (estaLiberada(turma.liberada)) {
            status.classList.add("liberada");
            status.textContent = "LIBERADA";
        } else {
            status.classList.add("aguardando");
            status.textContent = "AGUARDANDO";
        }

        linha.appendChild(informacoes);
        linha.appendChild(status);

        return linha;
    }

    /* EXIBIR FILA */
    function exibirFila(dados) {
        const turmas = Array.isArray(dados.turmas) ? dados.turmas : [];

        Object.values(filas).forEach(fila => {
            if (fila) fila.replaceChildren();
        });

        if (turmas.length === 0) {
            Object.values(filas).forEach(fila => {
                if (!fila) return;

                const mensagem = document.createElement("p");
                mensagem.className = "empty-message";
                mensagem.textContent = "Nenhuma turma cadastrada.";
                fila.appendChild(mensagem);
            });
            return;
        }

        turmas.forEach(turma => {
            const serie = obterSerie(turma.serie);
            const destino = filas[serie];

            if (destino) {
                destino.appendChild(criarLinha(turma));
            }
        });

        Object.values(filas).forEach(fila => {
            if (fila && fila.children.length === 0) {
                const mensagem = document.createElement("p");
                mensagem.className = "empty-message";
                mensagem.textContent = "Nenhuma turma nesta série.";
                fila.appendChild(mensagem);
            }
        });
    }

    /* CONSULTAR FILA */
    let carregandoFila = false;

    async function consultarFila() {
        if (carregandoFila) return;
        carregandoFila = true;

        try {
            const resposta = await fetch(API_FILA, {
                method: "GET",
                cache: "no-store"
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(dados.erro || "Não foi possível carregar a fila.");
            }

            exibirFila(dados);

        } catch (erro) {
            console.error("Erro ao carregar fila:", erro);

            Object.values(filas).forEach(fila => {
                if (!fila) return;
                fila.replaceChildren();

                const mensagem = document.createElement("p");
                mensagem.className = "error-message";
                mensagem.textContent = "Não foi possível carregar as turmas.";
                fila.appendChild(mensagem);
            });
        } finally {
            carregandoFila = false;
        }
    }

    /* MENSAGEM DE LIBERAÇÃO */
    function mostrarMensagem(mensagem, liberado) {
        if (!statusContainer || !statusBanner || !statusMensagem) {
            return;
        }

        statusContainer.style.display = "flex";
        statusMensagem.textContent = mensagem;

        statusBanner.classList.toggle("status-liberado", liberado);
        statusBanner.classList.toggle("status-aguardando", !liberado);

        if (statusIcon) {
            statusIcon.textContent = liberado ? "✓" : "●";
        }
    }

    /* CONSULTAR STATUS DO ALUNO */
    let consultandoStatus = false;

    async function consultarLiberacao() {
        if (consultandoStatus) return;
        consultandoStatus = true;

        try {
            const resposta = await fetch(API_STATUS, {
                method: "GET",
                cache: "no-store"
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(dados.erro || "Erro ao consultar situação.");
            }

            const liberado = estaLiberada(dados.liberado);

            mostrarMensagem(
                liberado
                    ? "Sua turma está liberada!"
                    : "Sua turma ainda está aguardando liberação.",
                liberado
            );

        } catch (erro) {
            console.error("Erro no status:", erro);
            mostrarMensagem("Não foi possível verificar sua situação.", false);
        } finally {
            consultandoStatus = false;
        }
    }

    /* BOTÃO SAIR */
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("aluno");
            localStorage.removeItem("dadosUsuario");
            localStorage.removeItem("tipoUsuario");

            window.location.href = "./index.html";
        });
    }

    /* TRATAMENTO DIFERENCIADO: PROFESSOR vs ALUNO */
    if (tipoUsuario === "professor") {
        if (statusContainer) {
            statusContainer.style.display = "none";
        }
        if (turmaAluno) {
            turmaAluno.textContent = "Professor(a)";
        }
    } else {
        consultarLiberacao();
        setInterval(consultarLiberacao, 5000);
    }

    /* INICIAR FILA */
    consultarFila();
    setInterval(consultarFila, 10000);
    setInterval(atualizarData, 60000);

});
