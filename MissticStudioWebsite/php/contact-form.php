<?php
session_start();

require_once 'config-upload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../vendor/autoload.php';

logSecurityEvent('PHP_CONFIG', [
    'max_file_uploads' => ini_get('max_file_uploads'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
], $ip);

// Détecter si le poids total dépasse post_max_size
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST) && $_SERVER['CONTENT_LENGTH'] > 0) {
    $max_size = ini_get('post_max_size');
    http_response_code(413 ); // Content Too Large
    echo json_encode([
        'success' => false, 
        'message' => "The total size of your files is too large (Limit: $max_size). Please send fewer files or compress them."
    ]);
    exit;
}

// Activer les erreurs mais ne pas les afficher au client
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Envoyer une réponse par défaut dès le début
header('Content-Type: application/json');

// Test basique - si on arrive jusque-là
if (defined('DIAGNOSTIC')) {
    echo json_encode(['status' => 'loaded']);
    exit;
}

// =============================================
// Constantes de sécurité
// =============================================
define('RATE_LIMIT_FILE', __DIR__ . '/../logs/rate-limit.json');
define('EMAIL_QUEUE_DIR', __DIR__ . '/../logs/email-queue');
define('TIME_TRAP_MIN', 0);       // Minimum 0 secondes
define('TIME_TRAP_MAX', 86400);   // Maximum 24 heures

// =============================================
// Charger les variables d'environnement du .env
// =============================================
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignore les commentaires
        if (strpos($line, '#') === 0) continue;
        
        if (strpos($line, '=') !== false) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Ne pas écraser si déjà défini
            if (!getenv($key)) {
                putenv($key . '=' . $value);
            }
        }
    }
}

// =============================================
// CORS Strict — Vérifier l'origin
// =============================================
$allowed_origins = [
    'https://www.missticstudio.com',
    'https://missticstudio.com',
    'http://localhost:8000', // Que pour tester, à enlever
    'https://precision-paramount-mocker.ngrok-free.dev', // Que pour tester, à enlever
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Max-Age: 3600');

error_reporting(E_ALL);
ini_set('display_errors', '0');

// =============================================
// CONFIGURATION EMAILS (À customiser)
// =============================================
// IMPORTANT : Ne pas stocker le password en clair !
$SMTP_HOST = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
$SMTP_PORT = getenv('SMTP_PORT') ?: 587;
$SMTP_USER = getenv('SMTP_USER') ?: 'contact@missticstudio.com';
$SMTP_PASS = getenv('SMTP_PASS') ?: '';
$EMAIL_TO = getenv('EMAIL_TO') ?: 'contact@missticstudio.com';  // ← CHANGE ICI POUR GMAIL OU PLANETHOSTER
$FORM_SECRET = getenv('FORM_SECRET') ?: 'your-secret-key';

// =============================================
// reCAPTCHA v3 Configuration
// =============================================
// Inscrivez-vous sur https://www.google.com/recaptcha/admin
// et obtenez votre SECRET_KEY
$RECAPTCHA_SECRET = getenv('RECAPTCHA_SECRET') ?: '';
$RECAPTCHA_MIN_SCORE = 0.5; // Score minimum (0.0-1.0)

// =============================================
// Logging de sécurité
// =============================================
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

// =============================================
// Session + IP — À INITIALISER EN PREMIER
// =============================================
$ip = $_SERVER['REMOTE_ADDR'];
$now = time();

function logSecurityEvent($type, $details, $ip) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/security.log';
    $message = "[$timestamp] [$type] IP: $ip | Details: " . json_encode($details) . "\n";
    @file_put_contents($logFile, $message, FILE_APPEND);
}

// =============================================
// GLOBAL ERROR HANDLERS
// =============================================
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    global $ip;
    logSecurityEvent('PHP_ERROR', [
        'errno' => $errno,
        'message' => $errstr,
        'file' => basename($errfile),
        'line' => $errline
    ], $ip);
    
    // Ne pas arrêter l'exécution pour les warnings
    return false;
});

set_exception_handler(function($e) {
    global $ip;
    logSecurityEvent('PHP_EXCEPTION', [
        'class' => get_class($e),
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], $ip);
    
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur: ' . $e->getMessage()]);
    exit;
});

// =============================================
// Fingerprint léger (empreinte utilisateur)
// =============================================
function generateFingerprint($ip, $user_agent) {
    return hash('sha256', $ip . '|' . $user_agent);
}

$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$fingerprint = generateFingerprint($ip, $user_agent);

// =============================================
// Rate Limiting Serveur — Fichier JSON
// =============================================
function getRateLimitData() {
    if (!file_exists(RATE_LIMIT_FILE)) {
        return [];
    }
    $data = @json_decode(file_get_contents(RATE_LIMIT_FILE), true);
    return is_array($data) ? $data : [];
}

function saveRateLimitData($data) {
    @file_put_contents(RATE_LIMIT_FILE, json_encode($data, JSON_PRETTY_PRINT));
}

function checkAndUpdateRateLimit($fingerprint, $maxSubmissions = 10, $windowSeconds = 3600) {
    $data = getRateLimitData();
    $now = time();
    
    // Nettoyer les entrées expirées
    foreach ($data as $fp => &$timestamps) {
        $timestamps = array_filter($timestamps, fn($t) => ($now - $t) < $windowSeconds);
    }
    
    // Vérifier si l'utilisateur a dépassé la limite
    if (!isset($data[$fingerprint])) {
        $data[$fingerprint] = [];
    }
    
    if (count($data[$fingerprint]) >= $maxSubmissions) {
        return false; // Rate limit dépassé
    }
    
    // Ajouter la nouvelle soumission
    $data[$fingerprint][] = $now;
    saveRateLimitData($data);
    return true;
}

// =============================================
// ANTI-SPAM — Honeypot
// =============================================
if (!empty($_POST['honeypot'])) {
    echo json_encode(['success' => true]); // Faux succès
    exit;
}

// =============================================
// TIME-TRAP — Formulaire soumis trop vite = bot
// =============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Le client envoie son timestamp de chargement (en millisecondes)
    // Convertir en secondes et comparer avec maintenant
    if (empty($_POST['submission_time'])) {
        logSecurityEvent('TIME_TRAP_MISSING_TIMESTAMP', [
            'reason' => 'submission_time missing from form'
        ], $ip);
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Formulaire soumis trop rapidement ou session expirée']);
        exit;
    }
    
    // Convertir le timestamp du client (ms) en secondes
    $clientLoadTimeMs = (int)$_POST['submission_time'];
    $clientLoadTimeSec = $clientLoadTimeMs / 1000;
    $serverTimeMs = time() * 1000; // Convertir le temps serveur en ms
    $serverTimeSec = $serverTimeMs / 1000;
    $timeDiff = ($serverTimeMs - $clientLoadTimeMs) / 1000; // Résultat en secondes
    
    // Log pour DEBUG
    logSecurityEvent('TIME_TRAP_DEBUG', [
        'clientTimeMs' => $clientLoadTimeMs,
        'clientTimeSec' => $clientLoadTimeSec,
        'serverTimeSec' => $serverTimeSec,
        'timeDiff' => $timeDiff,
        'result' => ($timeDiff >= TIME_TRAP_MIN && $timeDiff <= TIME_TRAP_MAX) ? 'PASSED' : 'FAILED'
    ], $ip);
    
    // ✅ Rejecter si < 0 sec OU > 24 heures
    if ($timeDiff < TIME_TRAP_MIN || $timeDiff > TIME_TRAP_MAX) {
        logSecurityEvent('TIME_TRAP_TRIGGERED', [
            'timeDiff' => $timeDiff,
            'min' => TIME_TRAP_MIN,
            'max' => TIME_TRAP_MAX,
            'clientLoadTime' => $clientLoadTimeSec,
            'serverTime' => $serverTimeSec
        ], $ip);
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Formulaire soumis trop rapidement ou session expirée']);
        exit;
    }
}

// =============================================
// PROTECTION CSRF améliorée avec expiration
// =============================================
$csrf_expiry = 3600; // 1 heure

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Régénérer un token s'il n'existe pas
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = $now;
    }
    
    // Vérifier le token CSRF
    if (empty($_POST['csrf_token'])) {
        logSecurityEvent('CSRF_MISSING', ['method' => 'POST'], $ip);
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Requête invalide (token manquant)']);
        exit;
    }
    
    $storedToken = $_SESSION['csrf_token'] ?? null;
    $storedTime = $_SESSION['csrf_token_time'] ?? 0;
    $incomingToken = $_POST['csrf_token'] ?? null;
    
    // Debug: log le token pour voir s'il y a un mismatch
    logSecurityEvent('CSRF_CHECK', [
        'incoming' => substr($incomingToken, 0, 20) . '...',
        'stored' => substr($storedToken, 0, 20) . '...',
        'match' => $storedToken === $incomingToken,
        'age_seconds' => $now - $storedTime
    ], $ip);
    
    if ($storedToken !== $incomingToken || ($now - $storedTime) > $csrf_expiry) {
        logSecurityEvent('CSRF_INVALID', [
            'reason' => 'Token invalide ou expiré',
            'match' => $storedToken === $incomingToken,
            'age' => $now - $storedTime
        ], $ip);
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Requête invalide (token expiré)']);
        exit;
    }
}

// Génère un token CSRF avec timestamp
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = $now;
}


// =============================================
// ANTI-SPAM — Rate limiting par Fingerprint (incontournable)
// =============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!checkAndUpdateRateLimit($fingerprint)) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', [
            'fingerprint' => substr($fingerprint, 0, 8) . '...'
        ], $ip);
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'Trop de soumissions. Réessayez dans 1 heure.']);
        exit;
    }
}

// =============================================
// TRAITEMENT DU FORMULAIRE
// =============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // === DEBUG: Log $_FILES at the very start ===
    logSecurityEvent('DEBUG_POST_START', [
        'files_keys' => array_keys($_FILES ?? []),
        'files_exists' => !empty($_FILES),
        'attachment_exists' => !empty($_FILES['attachment']),
        'attachment_structure' => $_FILES['attachment'] ?? null,
        'attachment_name_type' => is_array($_FILES['attachment']['name'] ?? null) ? 'array' : 'string',
        'attachment_name_count' => is_array($_FILES['attachment']['name'] ?? null) ? count($_FILES['attachment']['name']) : 1,
        'attachment_full_debug' => json_encode($_FILES['attachment'] ?? null),
        'post_content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
        'post_method' => $_SERVER['REQUEST_METHOD']
    ], $ip);
    
    try {
        // --- VALIDATION reCAPTCHA v3 ---
        if (!empty($RECAPTCHA_SECRET) && !empty($_POST['recaptcha_token'])) {
            $recaptchaUrl = 'https://www.google.com/recaptcha/api/siteverify';
            $recaptchaData = [
                'secret' => $RECAPTCHA_SECRET,
                'response' => $_POST['recaptcha_token']
            ];
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/x-www-form-urlencoded',
                    'content' => http_build_query($recaptchaData),
                    'timeout' => 5
                ]
            ]);
            
            $response = @file_get_contents($recaptchaUrl, false, $context);
            if ($response !== false) {
                $recaptchaResult = json_decode($response, true);
                
                if (empty($recaptchaResult['success']) || $recaptchaResult['score'] < $RECAPTCHA_MIN_SCORE) {
                    logSecurityEvent('RECAPTCHA_FAILED', [
                        'score' => $recaptchaResult['score'] ?? 0,
                        'action' => $recaptchaResult['action'] ?? 'unknown'
                    ], $ip);
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Vérification reCAPTCHA échouée']);
                    exit;
                }
            }
        }
        
        // --- VALIDATION ET SANITISATION ---
        if (empty($_POST['name']) || empty($_POST['email']) || empty($_POST['subject']) || empty($_POST['message'])) {
            throw new Exception('Tous les champs requis doivent être remplis');
        }

        // Validation et sanitisation email
        $email = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Adresse email invalide');
        }
        
        // Vérifier que le domaine email existe (optionnel mais recommandé)
        $emailDomain = substr($email, strpos($email, '@') + 1);
        if (!empty($emailDomain) && !preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/i', $emailDomain)) {
            throw new Exception('Domaine email invalide');
        }

        // Sanitisation des champs texte (plus stricte)
        // Note: strip_tags() nettoie les balises HTML
        $name    = strip_tags(trim($_POST['name']));
        $subject = strip_tags(trim($_POST['subject']));
        $message = strip_tags(trim($_POST['message']));
        
        // Prévention des injections SQL/NoSQL — Moins agressif (accepte Jean-Pierre, O'Connor, etc.)
        // On rejette seulement les caractères vraiment dangereux
        if (preg_match('/[<>\"%;()&=\[\]{}\\\|]/', $name) || preg_match('/[<>\"%;()&=\[\]{}\\\|]/', $subject)) {
            logSecurityEvent('INJECTION_ATTEMPT', ['fields' => 'name or subject'], $ip);
            throw new Exception('Caractères non autorisés');
        }
        
        // Validation simple : juste vérifier qu'il n'y a pas de caractères de contrôle
        // Pas de regex Unicode complexe pour éviter les erreurs
        foreach ([$name, $subject, $message] as $field) {
            if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $field)) {
                throw new Exception('Caractères invalides détectés');
            }
        }

        // Vérification de longueur (prévention DoS)
        if (strlen($name) > 100 || strlen($subject) > 200 || strlen($message) > 5000) {
            throw new Exception('Données trop longues');
        }

        if (strlen($message) < 10) {
            throw new Exception('Le message doit contenir au moins 10 caractères');
        }

        // --- CONFIGURATION EMAIL ---
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host       = $SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = $SMTP_USER;
        $mail->Password   = $SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $SMTP_PORT;
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer'       => true,
                'verify_peer_name'  => true,
                'allow_self_signed' => false,
            ],
        ];

        // --- EXPÉDITEUR ET DESTINATAIRE ---
        $mail->setFrom($SMTP_USER, 'Misstic Studio Contact');
        $mail->addAddress($EMAIL_TO);
        $mail->addReplyTo($email, $name);

        // --- CONTENU ---
        $mail->Subject = 'Misstic Studio Contact Form: ' . $subject;
        $mail->isHTML(false);
        $mail->Body = "Nom : " . $name . "\n"
                    . "Email : " . $email . "\n"
                    . "Message :\n" . $message;

        logSecurityEvent('DEBUG_FILES', [
            'files_raw' => $_FILES,
            'post_keys' => array_keys($_POST)
        ], $ip);

        // --- GESTION DES FICHIERS ---
        if (!empty($_FILES['attachment']['name'])) {
            // Normaliser $_FILES['attachment'] en array multidimensionnel
            // Cas 1: Plusieurs fichiers (FormData.append multiples) → ['name'] est ARRAY
            // Cas 2: Un seul fichier (FormData.append simple) → ['name'] est STRING
            if (!is_array($_FILES['attachment']['name'])) {
                // Un seul fichier: convertir en array
                $_FILES['attachment'] = [
                    'name' => [$_FILES['attachment']['name']],
                    'tmp_name' => [$_FILES['attachment']['tmp_name']],
                    'size' => [$_FILES['attachment']['size']],
                    'type' => [$_FILES['attachment']['type']],
                    'error' => [$_FILES['attachment']['error']],
                ];
            }

            $maxSize = 5 * 1024 * 1024; // 5 MB par fichier
            $maxTotal = 15 * 1024 * 1024; // 15 MB total
            $totalSize = 0;

            foreach ($_FILES['attachment']['tmp_name'] as $i => $tmpName) {

                // ✅ Détecter UPLOAD_ERR_INI_SIZE correctement
                if ($_FILES['attachment']['error'][$i] === UPLOAD_ERR_INI_SIZE) {
                    throw new Exception('File too large (limit 5MB): ' . $_FILES['attachment']['name'][$i]);
                }
                
                // Ignorer les slots vides (error != 0 pour d'autres raisons)
                if ($_FILES['attachment']['error'][$i] !== UPLOAD_ERR_OK) {
                    continue; // ← skip silencieux pour les autres erreurs
                }
                
                if (empty($tmpName)) continue;

                if ($_FILES['attachment']['error'][$i] === 0 && !empty($tmpName)) {
                    $fileSize = $_FILES['attachment']['size'][$i];
                    $totalSize += $fileSize;

                    // Vérification de taille
                    if ($fileSize > $maxSize) {
                        throw new Exception('File too large : ' . $_FILES['attachment']['name'][$i] . ' (max 5MB)');
                    }
                    if ($totalSize > $maxTotal) {
                        throw new Exception('Total files too large (max 15MB)');
                    }

                    // Vérification du type MIME - utiliser aussi l'extension
                    $fileExt = strtolower(pathinfo($_FILES['attachment']['name'][$i], PATHINFO_EXTENSION));
                    $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'svg', 'zip'];
                    $fileType = $_FILES['attachment']['type'][$i] ?? '';
                    
                    // Valider l'extension
                    if (!in_array($fileExt, $allowedExt)) {
                        logSecurityEvent('FILE_TYPE_MISMATCH', [
                            'filename' => $_FILES['attachment']['name'][$i],
                            'mime' => $fileType,
                            'ext' => $fileExt,
                            'reason' => 'Extension not allowed'
                        ], $ip);
                        throw new Exception('Type de fichier non autorisé : ' . $_FILES['attachment']['name'][$i]);
                    }

                    // Sanitisation du nom de fichier (prévention path traversal)
                    $fileName = basename($_FILES['attachment']['name'][$i]);
                    $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);

                    // Vérifier que le fichier temporaire existe
                    if (!file_exists($tmpName) || !is_readable($tmpName)) {
                        throw new Exception('Erreur de lecture du fichier : ' . $_FILES['attachment']['name'][$i]);
                    }

                    try {
                        $mail->addAttachment($tmpName, $fileName);
                    } catch (Exception $attachException) {
                        logSecurityEvent('ATTACHMENT_ERROR', [
                            'filename' => $_FILES['attachment']['name'][$i],
                            'error' => $attachException->getMessage()
                        ], $ip);
                        throw new Exception('Impossible d\'ajouter le fichier ' . $_FILES['attachment']['name'][$i] . ': ' . $attachException->getMessage());
                    }
                }
            }
        }

        // =============================================
        // 📦 QUEUE EMAIL — Sauvegarder avant d'envoyer
        // =============================================
        if (!is_dir(EMAIL_QUEUE_DIR)) {
            @mkdir(EMAIL_QUEUE_DIR, 0755, true);
        }
        
        $emailData = [
            'timestamp' => $now,
            'fingerprint' => substr($fingerprint, 0, 8),
            'from' => $email,
            'name' => $name,
            'subject' => $subject,
            'message' => $message,
            'ip' => $ip,
            'user_agent' => substr($user_agent, 0, 100),
        ];
        
        $queueFile = EMAIL_QUEUE_DIR . '/' . uniqid('email_', true) . '.json';
        @file_put_contents($queueFile, json_encode($emailData, JSON_PRETTY_PRINT));
        
        logSecurityEvent('DEBUG_PRE_SEND', [
        'smtp_host' => $SMTP_HOST,
        'smtp_user' => $SMTP_USER,
        'attachments_count' => count($mail->getAttachments()),
    ], $ip);

        // Tentative d'envoi (non-bloquant en production)
        try {
            $mail->send();
            @unlink($queueFile); // Supprimer du queue si succès
        } catch (Exception $sendException) {
            // Email reste en queue pour réessai ultérieur
            logSecurityEvent('EMAIL_SEND_FAILED', [
                'error' => $sendException->getMessage(),
                'queued' => true
            ], $ip);
        }
        
        // Recharger le token CSRF après soumission réussie
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = $now;
        
        // Log la soumission réussie
        logSecurityEvent('SUBMISSION_SUCCESS', [
            'email' => hash('sha256', $email),  // Hash pour la confidentialité
            'files_count' => count(array_filter($_FILES['attachment']['name'] ?? [])),
        ], $ip);

        echo json_encode(['success' => true, 'message' => 'Email envoyé avec succès']);

    } catch (Exception $e) {
        http_response_code(400);
        logSecurityEvent('SUBMISSION_ERROR', ['message' => $e->getMessage()], $ip);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
?>