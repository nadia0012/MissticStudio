<?php
// php/get-csrf-token.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// On génère TOUJOURS un token s'il n'existe pas
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = time();
}

echo json_encode([
    'token' => $_SESSION['csrf_token']
]);
?>