<?php
session_start();

// Génère un token CSRF s'il n'existe pas ou s'il a expiré
$now = time();
$csrf_expiry = 3600; // 1 heure

// S'IL N'EXISTE PAS OU EST EXPIRÉ, générer un nouveau
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = $now;
} elseif (($now - ($_SESSION['csrf_token_time'] ?? 0)) > $csrf_expiry) {
    // Token expiré, générer un nouveau
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = $now;
}
// Sinon: utiliser le token existant (NE PAS régénérer à chaque appel)

header('Content-Type: application/json');
echo json_encode([
    'token' => $_SESSION['csrf_token'],
    'expires_in' => $csrf_expiry,
    'generated_at' => $_SESSION['csrf_token_time']
]);
?>
