<?php
mysqli_report(MYSQLI_REPORT_OFF);

$host = 'localhost';
$usuario = 'rost';
$senha = '';
$banco = 'tcc_liberacao';

$mysqli = new mysqli(
    $host,
    $usuario,
    $senha,
    $banco
);
if ($mysqli->connect_errno) {
    error_log('Falha na conexão MySQL: ' . $mysqli->connect_error);

    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');

    echo json_encode([
        'sucesso' => false,
        'codigo' => 'erro_banco',
        'mensagem' => 'Não foi possível conectar ao banco de dados.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
$mysqli->set_charset('utf8mb4');
$conexao = $mysqli;
?>
