<?php
// =============================================
// INITIALISER LA SESSION POUR LE TIME-TRAP
// =============================================
// Ce fichier est appelé au chargement du formulaire
// Réinitialise TOUJOURS le timeout pour laisser l'utilisateur avoir un nouveau temps d'accès

session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// ✅ TOUJOURS réinitialiser le timestamp (à chaque chargement)
// C'est important pour que les recharges de page fonctionnent
$_SESSION['form_access_time'] = time();
session_write_close(); // Force la sauvegarde

// Retourner confirmation
echo json_encode([
    'success' => true,
    'timestamp' => $_SESSION['form_access_time'],
    'message' => 'Form session initialized (reset)',
    'debug_info' => [
        'session_id' => session_id(),
        'form_access_time' => $_SESSION['form_access_time']
    ]
]);
?>