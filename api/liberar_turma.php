<?php

require_once __DIR__ . '/conexao.php';

header('Content-Type: application/json; charset=UTF-8');

date_default_timezone_set('America/Fortaleza');

function responder($dados, $codigo = 200) {
    http_response_code($codigo);

    echo json_encode($dados, JSON_UNESCAPED_UNICODE);

    exit;
}

/* =====================================================
   VERIFICAR MÉTODO
===================================================== */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], 405);
}

/* =====================================================
   VALIDAR TURMA
===================================================== */

$idTurma = filter_input(
    INPUT_POST,
    'id_turma',
    FILTER_VALIDATE_INT
);

if (!$idTurma || $idTurma <= 0) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Turma inválida.'
    ], 400);
}

/* =====================================================
   DEFINIR DATA E CICLO
===================================================== */

$inicio = new DateTimeImmutable('2026-11-03');
$hoje = new DateTimeImmutable(date('Y-m-d'));

if ($hoje < $inicio) {
    responder([
        'sucesso' => false,
        'mensagem' => 'A programação começa em 03/11/2026.'
    ], 400);
}

$dias = (int) $inicio->diff($hoje)->format('%a');

$ciclo = ($dias % 4) + 1;

$dataHoje = $hoje->format('Y-m-d');
$horarioAtual = date('Y-m-d H:i:s');

/* =====================================================
   INICIAR TRANSAÇÃO
===================================================== */

if (!$mysqli->begin_transaction()) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Não foi possível iniciar a liberação.'
    ], 500);
}

try {

    /* =============================================
       VERIFICAR SE A TURMA PERTENCE AO CICLO
    ============================================= */

    $sql = "
        SELECT ordem
        FROM programacao_ciclo
        WHERE ciclo = ?
          AND id_turma = ?
        FOR UPDATE
    ";

    $stmt = $mysqli->prepare($sql);

    if (!$stmt) {
        throw new Exception('Erro ao consultar a programação.');
    }

    $stmt->bind_param('ii', $ciclo, $idTurma);

    if (!$stmt->execute()) {
        throw new Exception('Erro ao verificar a turma.');
    }

    $resultado = $stmt->get_result();
    $programacao = $resultado->fetch_assoc();

    $stmt->close();

    if (!$programacao) {
        throw new Exception('Turma não encontrada na programação.');
    }

    $ordem = (int) $programacao['ordem'];

    /* =============================================
       VERIFICAR SE JÁ FOI LIBERADA HOJE
    ============================================= */

    $sql = "
        SELECT id_liberacao
        FROM liberacao
        WHERE id_turma = ?
          AND data_liberacao = ?
          AND status = 1
        LIMIT 1
    ";

    $stmt = $mysqli->prepare($sql);

    if (!$stmt) {
        throw new Exception('Erro ao verificar a liberação.');
    }

    $stmt->bind_param('is', $idTurma, $dataHoje);

    if (!$stmt->execute()) {
        throw new Exception('Erro ao consultar as liberações.');
    }

    $resultado = $stmt->get_result();

    if ($resultado->num_rows > 0) {
        $stmt->close();

        throw new Exception('Essa turma já foi liberada hoje.');
    }

    $stmt->close();

    /* =============================================
       REGISTRAR LIBERAÇÃO
    ============================================= */

    $sql = "
        INSERT INTO liberacao (
            horario_liberacao,
            ordem_liberacao,
            status,
            id_turma,
            data_liberacao
        )
        VALUES (?, ?, 1, ?, ?)
    ";

    $stmt = $mysqli->prepare($sql);

    if (!$stmt) {
        throw new Exception('Erro ao preparar o registro da liberação.');
    }

    $stmt->bind_param(
        'siis',
        $horarioAtual,
        $ordem,
        $idTurma,
        $dataHoje
    );

    if (!$stmt->execute()) {
        throw new Exception('Não foi possível registrar a liberação.');
    }

    $stmt->close();

    /* =============================================
       CONFIRMAR TRANSAÇÃO
    ============================================= */

    $mysqli->commit();

    responder([
        'sucesso' => true,
        'mensagem' => 'Turma liberada com sucesso!',
        'ciclo' => $ciclo,
        'ordem' => $ordem
    ]);

} catch (Throwable $erro) {

    $mysqli->rollback();

    $codigo = 500;

    if (
        $erro->getMessage() === 'Essa turma já foi liberada hoje.'
    ) {
        $codigo = 409;
    }

    if (
        $erro->getMessage() === 'Turma não encontrada na programação.'
    ) {
        $codigo = 404;
    }

    if ($codigo === 500) {
        error_log('Erro ao liberar turma: ' . $erro->getMessage());
    }

    responder([
        'sucesso' => false,
        'mensagem' => $codigo === 500
            ? 'Ocorreu um erro ao registrar a liberação.'
            : $erro->getMessage()
    ], $codigo);
}

?>