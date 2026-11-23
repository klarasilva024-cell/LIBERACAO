
<?php

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
   CONEXÃO
===================================== */

if (!isset($mysqli) || $mysqli->connect_errno) {
    responder([
        'sucesso' => false,
        'erro' => 'Erro na conexão com o banco de dados.'
    ], 500);
}

/* =====================================
   IDENTIFICAR COLUNA DA TURMA
===================================== */

$colunas = [];

$estrutura = $mysqli->query("SHOW COLUMNS FROM turma");

if (!$estrutura) {
    responder([
        'sucesso' => false,
        'erro' => 'Não foi possível consultar a estrutura da tabela turma.'
    ], 500);
}

while ($coluna = $estrutura->fetch_assoc()) {
    $colunas[] = $coluna['Field'];
}

$estrutura->free();

/*
 * Procura uma coluna que contenha a identificação:
 * 1ºA, 1ºB, 2ºA, 3ºB etc.
 */

$possiveisColunas = [
    'identificacao_turma',
    'codigo_turma',
    'sigla_turma',
    'turma'
];

$colunaIdentificacao = null;

foreach ($possiveisColunas as $possivel) {
    if (in_array($possivel, $colunas, true)) {
        $colunaIdentificacao = $possivel;
        break;
    }
}

/* =====================================
   DATA E CICLO
===================================== */

$inicio = new DateTimeImmutable('2026-11-03');

$hoje = new DateTimeImmutable(date('Y-m-d'));

if ($hoje < $inicio) {
    responder([
        'sucesso' => true,
        'data' => $hoje->format('Y-m-d'),
        'ciclo' => 1,
        'total_turmas' => 0,
        'turmas' => []
    ]);
}

$dias = (int) $inicio->diff($hoje)->format('%a');

$ciclo = ($dias % 4) + 1;

$dataHoje = $hoje->format('Y-m-d');

/* =====================================
   CAMPO DA IDENTIFICAÇÃO
===================================== */

if ($colunaIdentificacao !== null) {

    $campoIdentificacao =
        "t.`" . $colunaIdentificacao . "`";

} else {

    $campoIdentificacao = "NULL";

}

/* =====================================
   CONSULTA DAS TURMAS
===================================== */

$sql = "

    SELECT

        pc.id_turma,

        pc.ordem,

        t.nome_turma,

        t.serie,

        $campoIdentificacao AS identificacao_turma,

        l.horario_liberacao

    FROM programacao_ciclo pc

    INNER JOIN turma t
        ON t.id_turma = pc.id_turma

    LEFT JOIN (

        SELECT

            id_turma,

            MAX(horario_liberacao)
                AS horario_liberacao

        FROM liberacao

        WHERE data_liberacao = ?
          AND status = 1

        GROUP BY id_turma

    ) l

        ON l.id_turma = pc.id_turma

    WHERE pc.ciclo = ?

    ORDER BY pc.ordem ASC

";

/* =====================================
   PREPARAR CONSULTA
===================================== */

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    responder([
        'sucesso' => false,
        'erro' => 'Erro ao preparar consulta: ' . $mysqli->error
    ], 500);
}

/* =====================================
   EXECUTAR CONSULTA
===================================== */

$stmt->bind_param('si', $dataHoje, $ciclo);

if (!$stmt->execute()) {
    responder([
        'sucesso' => false,
        'erro' => 'Erro ao executar consulta: ' . $stmt->error
    ], 500);
}

$resultado = $stmt->get_result();

if (!$resultado) {
    responder([
        'sucesso' => false,
        'erro' => 'Erro ao obter resultados.'
    ], 500);
}

/* =====================================
   ORGANIZAR TURMAS
===================================== */

$turmas = [];

while ($linha = $resultado->fetch_assoc()) {

    $turmas[] = [

        'id_turma' => (int) $linha['id_turma'],

        'ordem' => (int) $linha['ordem'],

        'nome_turma' => $linha['nome_turma'],

        'serie' => $linha['serie'],

        'identificacao_turma' =>
            $linha['identificacao_turma'],

        'liberada' =>
            $linha['horario_liberacao'] !== null,

        'horario_liberacao' =>
            $linha['horario_liberacao']

    ];

}

$stmt->close();

/* =====================================
   RESPOSTA
===================================== */

responder([

    'sucesso' => true,

    'data' => $dataHoje,

    'data_inicio' => '2026-11-03',

    'dias_decorridos' => $dias,

    'ciclo' => $ciclo,

    'total_turmas' => count($turmas),

    'turmas' => $turmas,

    'campo_identificacao_encontrado' =>
        $colunaIdentificacao !== null,

    'campo_utilizado' =>
        $colunaIdentificacao

]);

?>
