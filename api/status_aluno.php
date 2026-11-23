<?php

session_start();

require_once __DIR__ . '/conexao.php';

header('Content-Type: application/json; charset=UTF-8');

date_default_timezone_set('America/Fortaleza');

function responder($dados, $codigo = 200) {
    http_response_code($codigo);

    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

/* =====================================
   VERIFICAR CONEXÃO
===================================== */

if (!isset($mysqli) || $mysqli->connect_errno) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Erro na conexão com o banco de dados.'
    ], 500);
}

/* =====================================
   VERIFICAR SESSÃO
===================================== */

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Sessão não encontrada.'
    ], 401);
}

$tipoUsuario = $_SESSION['tipo'] ?? '';

/* =====================================
   SE FOR PROFESSOR (Retorna neutro sem erro)
===================================== */

if ($tipoUsuario === 'professor') {
    responder([
        'sucesso' => true,
        'liberado' => false,
        'mensagem' => 'Painel do Professor'
    ]);
}

/* =====================================
   VERIFICAR SESSÃO DO ALUNO
===================================== */

if ($tipoUsuario !== 'aluno' || empty($_SESSION['id_turma'])) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Sessão do aluno não encontrada.'
    ], 401);
}

$idTurma = (int) $_SESSION['id_turma'];

if ($idTurma <= 0) {
    responder([
        'sucesso' => false,
        'mensagem' => 'ID da turma inválido.'
    ], 400);
}

$dataHoje = date('Y-m-d');

/* =====================================
   CONSULTAR LIBERAÇÃO
===================================== */

$sql = "
    SELECT
        horario_liberacao
    FROM liberacao
    WHERE id_turma = ?
      AND data_liberacao = ?
      AND status = 1
    ORDER BY horario_liberacao DESC
    LIMIT 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Erro ao preparar consulta: ' . $mysqli->error
    ], 500);
}

$stmt->bind_param('is', $idTurma, $dataHoje);

if (!$stmt->execute()) {
    responder([
        'sucesso' => false,
        'mensagem' => 'Erro ao executar consulta: ' . $stmt->error
    ], 500);
}

$resultado = $stmt->get_result();
$liberacao = $resultado->fetch_assoc();
$stmt->close();

$liberada = ($liberacao !== null);

responder([
    'sucesso' => true,
    'id_turma' => $idTurma,
    'data' => $dataHoje,
    'liberada' => $liberada,
    'liberado' => $liberada,
    'horario_liberacao' => $liberacao['horario_liberacao'] ?? null
]);

?>