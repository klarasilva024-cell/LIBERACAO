let aguardando = 9;
let liberadas = 3;

const totalTurmas = 12;


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function navegarPara(acao) {

    if (acao === 'voltar') {

        window.location.href = 'index.html';

    } else if (acao === 'sair') {

        alert("Sessão encerrada com sucesso.");

        window.location.href = 'index.html';

    }

}


/* =========================================================
   LIBERAR TURMA
========================================================= */

function liberarTurma(botao, nomeTurma) {

    const classRow =
        botao.closest('.class-row');


    const actionGroup =
        classRow.querySelector('.action-group');


    /* Atualiza visual da turma */

    classRow.classList.add('released');


    actionGroup.innerHTML =
        '<span class="status-badge released">Liberada</span>';


    /* Atualiza contadores */

    aguardando--;

    liberadas++;


    /* Atualiza KPIs */

    document.getElementById(
        'kpi-aguardando'
    ).innerText = aguardando;


    document.getElementById(
        'kpi-ultima-liberada'
    ).innerText = nomeTurma;


    document.getElementById(
        'kpi-realizadas'
    ).innerText =
        `${liberadas}/${totalTurmas}`;


    /* Procura a próxima turma */

    const proximoElemento =
        document.querySelector(
            '.class-row:not(.released) .class-name'
        );


    if (proximoElemento) {

        document.getElementById(
            'kpi-proxima'
        ).innerText =
            proximoElemento.innerText;

    } else {

        document.getElementById(
            'kpi-proxima'
        ).innerText =
            "Todas liberadas";

    }

}