
<?php

session_start();

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');

function responder($status, $dados)
{
    http_response_code($status);
    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

try {

    require_once __DIR__ . "/conexao.php";

    if (!isset($conexao) || $conexao->connect_error) {
        throw new Exception("Erro de conexão com o banco de dados.");
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        responder(405, [
            "sucesso" => false,
            "codigo" => "metodo_invalido",
            "mensagem" => "Método não permitido."
        ]);
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        $dados = $_POST;
    }

    $identificador = trim((string)(
        $dados["matricula"]
        ?? $dados["login"]
        ?? $dados["usuario"]
        ?? ""
    ));

    $senha = (string)($dados["senha"] ?? "");
    $tipo = (string)($dados["tipo"] ?? "");

    if ($identificador === "" || trim($senha) === "") {
        responder(400, [
            "sucesso" => false,
            "codigo" => "campos_vazios",
            "mensagem" => "Preencha todos os campos."
        ]);
    }

    if (!in_array($tipo, ["aluno", "supervisora", "professor"], true)) {
        responder(400, [
            "sucesso" => false,
            "codigo" => "tipo_invalido",
            "mensagem" => "Selecione o tipo de usuário."
        ]);
    }

    // AUTENTICAÇÃO DA SUPERVISORA
    if ($tipo === "supervisora") {

        $sql = "
            SELECT
                id_supervisora AS id_usuario,
                nome,
                `matrícula` AS identificador,
                senha,
                ativo
            FROM supervisora
            WHERE `matrícula` = ?
            LIMIT 1
        ";

    } elseif ($tipo === "professor") {

        $sql = "
            SELECT
                id_professor AS id_usuario,
                nome,
                `matrícula` AS identificador,
                senha,
                1 AS ativo
            FROM professor
            WHERE `matrícula` = ?
            LIMIT 1
        ";

    } else {

        $sql = "
            SELECT
                a.id_aluno AS id_usuario,
                a.nome,
                a.matricula AS identificador,
                a.senha,
                a.ativo,
                a.id_turma,
                t.nome_turma,
                t.serie
            FROM aluno AS a
            LEFT JOIN turma AS t
                ON a.id_turma = t.id_turma
            WHERE a.matricula = ?
            LIMIT 1
        ";
    }

    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        throw new Exception(
            "Erro ao preparar consulta: " . $conexao->error
        );
    }

    $stmt->bind_param("s", $identificador);

    if (!$stmt->execute()) {
        $erro = $stmt->error;
        $stmt->close();

        throw new Exception("Erro ao executar consulta: " . $erro);
    }

    $resultado = $stmt->get_result();
    $usuario = $resultado->fetch_assoc();

    $stmt->close();

    if (!$usuario) {
        responder(401, [
            "sucesso" => false,
            "codigo" => "login_invalido",
            "mensagem" => "Matrícula ou senha incorretos."
        ]);
    }

    // VERIFICA SE O CADASTRO ESTÁ ATIVO
    if (
        isset($usuario["ativo"]) &&
        (int)$usuario["ativo"] !== 1
    ) {
        responder(403, [
            "sucesso" => false,
            "codigo" => "cadastro_inativo",
            "mensagem" => "Este cadastro está inativo."
        ]);
    }

    // VALIDAÇÃO DA SENHA
    $senhaBanco = (string)($usuario["senha"] ?? "");
    $senhaCorreta = false;

    if ($senhaBanco !== "") {

        if (hash_equals($senhaBanco, $senha)) {
            $senhaCorreta = true;

        } elseif (password_verify($senha, $senhaBanco)) {
            $senhaCorreta = true;
        }
    }

    if (!$senhaCorreta) {
        responder(401, [
            "sucesso" => false,
            "codigo" => "login_invalido",
            "mensagem" => "Matrícula ou senha incorretos."
        ]);
    }

    // CRIA A SESSÃO
    session_regenerate_id(true);

    $_SESSION["logado"] = true;
    $_SESSION["tipo"] = $tipo;
    $_SESSION["usuario_id"] = (int)$usuario["id_usuario"];
    $_SESSION["usuario_nome"] = $usuario["nome"];
    $_SESSION["usuario_login"] = $usuario["identificador"];

    $dadosUsuario = [
        "id" => (int)$usuario["id_usuario"],
        "nome" => $usuario["nome"],
        "login" => $usuario["identificador"],
        "tipo" => $tipo
    ];

    $dadosAluno = null;

    if ($tipo === "aluno") {

        $serie = $usuario["serie"] ?? "";
        $nomeTurma = $usuario["nome_turma"] ?? "";

        $dadosAluno = [
            "id_aluno" => (int)$usuario["id_usuario"],
            "nome" => $usuario["nome"],
            "matricula" => $usuario["identificador"],
            "id_turma" => $usuario["id_turma"] !== null
                ? (int)$usuario["id_turma"]
                : null,
            "nome_turma" => $nomeTurma,
            "serie" => $serie,
            "turma" => trim($serie . " " . $nomeTurma)
        ];

        $_SESSION["matricula"] = $usuario["identificador"];
        $_SESSION["id_turma"] = $usuario["id_turma"];
        $_SESSION["serie"] = $serie;

    } elseif ($tipo === "professor") {

        $dadosAluno = [
            "nome" => $usuario["nome"],
            "matricula" => $usuario["identificador"],
            "serie" => "",
            "turma" => "Professor(a)"
        ];
    }

    // REDIRECIONAMENTO
    $redirecionar = ($tipo === "supervisora")
        ? "../painel-de-controle.html"
        : "../tela%20do%20aluno.html";

    $conexao->close();

    responder(200, [
        "sucesso" => true,
        "mensagem" => "Login realizado com sucesso!",
        "tipo" => $tipo,
        "usuario" => $usuario["identificador"],
        "dadosUsuario" => $dadosUsuario,
        "aluno" => $dadosAluno,
        "redirecionar" => $redirecionar
    ]);

} catch (Throwable $e) {

    responder(500, [
        "sucesso" => false,
        "codigo" => "erro_interno",
        "mensagem" => "Erro no servidor: " . $e->getMessage()
    ]);
}

?>
