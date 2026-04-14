<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Charger l'autoloader Composer (chemin correct depuis php/)
require '../vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Gestion des erreurs PHP pour éviter d'afficher des warnings/notices
error_reporting(E_ALL);
ini_set('display_errors', '0');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Vérifier que les données requises sont présentes
        if (empty($_POST['name']) || empty($_POST['email']) || empty($_POST['subject']) || empty($_POST['message'])) {
            throw new Exception('Tous les champs requis doivent être remplis');
        }

        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';

        // --- CONFIGURATION GMAIL SMTP ---
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'nadiarochdi08@gmail.com';
        $mail->Password   = 'ujhelgouknthgtfb';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- EXPÉDITEUR ET DESTINATAIRE ---
        $mail->setFrom('nadiarochdi08@gmail.com', 'Misstic Studio');
        $mail->addAddress('nadiarochdi08@gmail.com');
        $mail->addReplyTo($_POST['email'], $_POST['name']);

        // --- CONTENU ---
        $mail->Subject = '[Contact] ' . $_POST['subject'];
        $mail->Body    = "Nom : " . $_POST['name'] . "\n"
                        . "Email : " . $_POST['email'] . "\n\n"
                        . "Message :\n" . $_POST['message'];

        // Pièces jointes (si présentes)
        if (!empty($_FILES['attachment']['name'][0])) {
            foreach ($_FILES['attachment']['tmp_name'] as $i => $tmpName) {
                if ($_FILES['attachment']['error'][$i] === 0) {
                    $mail->addAttachment($tmpName, $_FILES['attachment']['name'][$i]);
                }
            }
        }

        $mail->send();
        echo json_encode(['success' => true, 'message' => 'Email envoyé avec succès']);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Erreur : " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
?>