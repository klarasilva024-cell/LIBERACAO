
<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

header("Cache-Control: no-store, no-cache, must-revalidate");

if (!isset($_SESSION["usuario_nome"])) {
    http_response_code(401);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Usuário não autenticado."
    ]);

    exit;
}

echo json_encode([
    "sucesso" => true,
    "nome" => $_SESSION["usuario_nome"],
    "cargo" => $_SESSION["usuario_cargo"] ?? "Supervisor(a)"
], JSON_UNESCAPED_UNICODE);
?>