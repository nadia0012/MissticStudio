<?php
/**
 * Process Email Queue
 * 
 * Script pour traiter les emails en queue (si SMTP a échoué)
 * Peut être appelé manuellement ou via un cron job
 * 
 * Usage:
 *   php process-email-queue.php
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../vendor/autoload.php';

// =============================================
// Charger les variables d'environnement du .env
// =============================================
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!getenv($key)) {
                putenv($key . '=' . $value);
            }
        }
    }
}

// =============================================
// Configuration
// =============================================
$EMAIL_QUEUE_DIR = __DIR__ . '/../logs/email-queue';
$SMTP_HOST = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
$SMTP_PORT = getenv('SMTP_PORT') ?: 587;
$SMTP_USER = getenv('SMTP_USER') ?: 'contact@missticstudio.com';
$SMTP_PASS = getenv('SMTP_PASS') ?: '';
$EMAIL_TO = getenv('EMAIL_TO') ?: 'contact@missticstudio.com';

$logDir = __DIR__ . '/../logs';
$logFile = $logDir . '/email-queue.log';

function logQueue($message) {
    global $logFile, $logDir;
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// =============================================
// Traiter la queue
// =============================================
if (!is_dir($EMAIL_QUEUE_DIR)) {
    logQueue('Aucune queue trouvée');
    exit(0);
}

$queueFiles = glob($EMAIL_QUEUE_DIR . '/*.json');
if (empty($queueFiles)) {
    logQueue('Queue vide');
    exit(0);
}

logQueue('Traitement de ' . count($queueFiles) . ' email(s)');

foreach ($queueFiles as $queueFile) {
    try {
        $emailData = json_decode(file_get_contents($queueFile), true);
        
        if (!$emailData) {
            logQueue('Fichier corrompu: ' . basename($queueFile));
            @unlink($queueFile);
            continue;
        }
        
        // Configurer PHPMailer
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host = $SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = $SMTP_USER;
        $mail->Password = $SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $SMTP_PORT;
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ];
        
        // Expéditeur et destinataire
        $mail->setFrom($SMTP_USER, 'Misstic Studio Contact');
        $mail->addAddress($EMAIL_TO);
        $mail->addReplyTo($emailData['from'], $emailData['name']);
        
        // Contenu
        $mail->Subject = '[Contact] ' . $emailData['subject'];
        $mail->isHTML(false);
        $mail->Body = "Nom : " . $emailData['name'] . "\n"
                    . "Email : " . $emailData['from'] . "\n"
                    . "IP : " . $emailData['ip'] . "\n"
                    . "User-Agent : " . $emailData['user_agent'] . "\n"
                    . "Timestamp : " . date('Y-m-d H:i:s', $emailData['timestamp']) . "\n\n"
                    . "Message :\n" . $emailData['message'];
        
        // Envoi
        $mail->send();
        
        // Succès : supprimer du queue
        @unlink($queueFile);
        logQueue('✓ Email envoyé : ' . basename($queueFile));
        
    } catch (Exception $e) {
        logQueue('✗ Erreur pour ' . basename($queueFile) . ' : ' . $e->getMessage());
    }
}

logQueue('Traitement terminé');
echo "Email queue traité\n";
?>
