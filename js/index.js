let tipoSelecionado = "aluno";

function selecionarAba(tipo) {
    tipoSelecionado = tipo;

    const supervisora = document.getElementById("tab-supervisora");
    const professor = document.getElementById("tab-professor");
    const alunos = document.getElementById("tab-alunos");
    const titulo = document.getElementById("titulo");
    const subtitulo = document.getElementById("subtitulo");
    const usuario = document.getElementById("usuario");
    const senha = document.getElementById("senha");
    
    if (alunos) alunos.classList.toggle("active", tipoSelecionado === "aluno");
    if (professor) professor.classList.toggle("active", tipoSelecionado === "professor");
    if (supervisora) supervisora.classList.toggle("active", tipoSelecionado === "supervisora");

    if (titulo) {
        if (tipoSelecionado === "aluno") {
            titulo.textContent = "Acesso do aluno";
        } else if (tipoSelecionado === "professor") {
            titulo.textContent = "Acesso do Professor";
        } else {
            titulo.textContent = "Acesso restrito";
        }
    }

    if (subtitulo) {
        subtitulo.textContent = "Entre com suas credenciais para continuar.";
    }

    if (usuario) {
        usuario.placeholder = tipoSelecionado === "aluno" ? "Digite sua matrícula" : "Digite sua matrícula";
        usuario.value = "";
    }

    if (senha) {
        senha.value = "";
        senha.type = "password";
    }
}

function mostrarSenha() {
    const senha = document.getElementById("senha");
    if (!senha) return;
    senha.type = senha.type === "password" ? "text" : "password";
}

async function entrar(event) {
    event.preventDefault();

    const usuarioInput = document.getElementById("usuario");
    const senhaInput = document.getElementById("senha");
    const botao = document.querySelector(".submit-button");

    if (!usuarioInput || !senhaInput) return;

    const identificador = usuarioInput.value.trim();
    const senha = senhaInput.value;

    if (identificador === "" || senha.trim() === "") {
        alert("Preencha todos os campos.");
        return;
    }

    const textoOriginal = botao ? botao.textContent : "";
    if (botao) {
        botao.disabled = true;
        botao.textContent = "Entrando...";
    }

    try {
        const resposta = await fetch("./api/login.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                matricula: identificador,
                login: identificador,
                senha: senha,
                tipo: tipoSelecionado
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert(dados.mensagem || "Não foi possível realizar o login.");
            return;
        }

        localStorage.clear();
        localStorage.setItem("tipoUsuario", dados.tipo);
        localStorage.setItem("usuario", String(dados.usuario ?? ""));

        if (dados.dadosUsuario) {
            localStorage.setItem("dadosUsuario", JSON.stringify(dados.dadosUsuario));
        }

        if (dados.aluno) {
            localStorage.setItem("aluno", JSON.stringify(dados.aluno));
        }

        window.location.href = dados.redirecionar;

    } catch (erro) {
        console.error("Erro no login:", erro);
        alert("Não foi possível conectar ao servidor.");
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal || "Entrar";
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    selecionarAba("aluno");
});