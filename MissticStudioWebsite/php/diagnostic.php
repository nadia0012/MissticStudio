<?php
/**
 * Diagnostic CSRF Token
 * 
 * Vérifie que le CSRF token est correctement chargé et utilisable
 * 
 * URL: http://localhost:8000/php/diagnostic.php
 */

session_start();

header('Content-Type: application/json');

$diagnostic = [
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'session_status' => session_status(),
    'session_id' => session_id(),
    'csrf_token_exists' => !empty($_SESSION['csrf_token']),
    'csrf_token_length' => strlen($_SESSION['csrf_token'] ?? ''),
    'csrf_token_time' => $_SESSION['csrf_token_time'] ?? null,
    'csrf_token_time_ago_seconds' => time() - ($_SESSION['csrf_token_time'] ?? 0),
    'server_time' => time(),
    'remote_addr' => $_SERVER['REMOTE_ADDR'],
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'http_origin' => $_SERVER['HTTP_ORIGIN'] ?? 'NOT SET',
];

// Générer un token si manquant
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = time();
    $diagnostic['token_generated'] = true;
} else {
    $diagnostic['token_generated'] = false;
}

$diagnostic['csrf_token'] = substr($_SESSION['csrf_token'], 0, 20) . '...';

echo json_encode($diagnostic, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
