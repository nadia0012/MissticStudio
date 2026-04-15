# 🔐 ADVANCED_SECURITY.md
## Misstic Studio — Détails Techniques des Protections

**Version:** 2.1 | **Dernière mise à jour:** 14 Avril 2026

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Protection 1 — Rate Limit Fichier + Fingerprint](#protection-1--rate-limit-fichier--fingerprint)
3. [Protection 2 — Time-Trap Anti-Bot](#protection-2--time-trap-anti-bot)
4. [Protection 3 — CORS Strict](#protection-3--cors-strict)
5. [Protection 4 — Email Queue Non-Bloquante](#protection-4--email-queue-non-bloquante)
6. [Protection 5 — Fingerprint SHA256](#protection-5--fingerprint-sha256)
7. [Protection 6 — Injection Check Intelligent](#protection-6--injection-check-intelligent)
8. [Protection 7 — reCAPTCHA v3](#protection-7--recaptcha-v3)
9. [Configuration Production](#configuration-production)
10. [Lecture des Logs](#lecture-des-logs)
11. [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Le formulaire de contact de Misstic Studio est protégé par **8 couches de sécurité** imbriquées. Chaque couche intercepte un vecteur d'attaque différent. Une requête malveillante doit contourner **toutes** les couches pour réussir — ce qui est pratiquement impossible sans accès direct au serveur.

```
Requête entrante
       │
       ▼
┌──────────────┐
│  CORS Check  │ ← Origin non autorisée? → Bloqué immédiatement
└──────┬───────┘
       ▼
┌──────────────┐
│  Fingerprint │ ← SHA256(IP + User-Agent) généré
└──────┬───────┘
       ▼
┌──────────────┐
│  Rate Limit  │ ← 3 tentatives/heure dépassées? → 429
└──────┬───────┘
       ▼
┌──────────────┐
│  Time-Trap   │ ← Soumis en < 2s ou > 5 min? → Rejeté
└──────┬───────┘
       ▼
┌──────────────┐
│  reCAPTCHA   │ ← Score < 0.5? → Rejeté (si activé)
└──────┬───────┘
       ▼
┌──────────────┐
│  Injection   │ ← Caractères dangereux? → Rejeté
│    Check     │
└──────┬───────┘
       ▼
┌──────────────┐
│ Validation   │ ← Champs manquants / email invalide? → Rejeté
│  des Champs  │
└──────┬───────┘
       ▼
┌──────────────┐
│ Email Queue  │ ← Sauvegarde JSON → envoi asynchrone
└──────────────┘
```

---

## Protection 1 — Rate Limit Fichier + Fingerprint

### Pourquoi c'est mieux qu'une session PHP

L'ancien système utilisait `$_SESSION` pour compter les soumissions. Un bot pouvait contourner ça simplement en :
- Supprimant ses cookies
- Changeant son IP via VPN
- Relançant le navigateur

Le nouveau système stocke les données côté serveur dans `/logs/rate-limit.json`, indexées par **fingerprint** (voir Protection 5). Aucune donnée côté client n'est impliquée.

### Fonctionnement

```json
// Exemple de /logs/rate-limit.json
{
  "a3f8c2d1e9b4...": {
    "count": 2,
    "first_attempt": 1713100800,
    "last_attempt": 1713101200
  },
  "7b2e9f4a1c83...": {
    "count": 3,
    "first_attempt": 1713099000,
    "last_attempt": 1713099800
  }
}
```

- La clé est le **fingerprint SHA256** de l'utilisateur
- `count` est incrémenté à chaque soumission
- `first_attempt` est le timestamp de la première soumission de la fenêtre
- Si `now - first_attempt > 3600` (1 heure), le compteur est remis à zéro
- Si `count >= 3`, la requête est rejetée avec HTTP **429 Too Many Requests**

### Configuration

```php
// Dans contact-form.php
define('RATE_LIMIT_MAX', 3);        // Soumissions max par heure
define('RATE_LIMIT_WINDOW', 3600);  // Fenêtre en secondes (1 heure)
define('RATE_LIMIT_FILE', __DIR__ . '/../logs/rate-limit.json');
```

### Nettoyage automatique

Les entrées expirées (> 1 heure) sont supprimées du JSON à chaque requête pour éviter que le fichier grossisse indéfiniment.

---

## Protection 2 — Time-Trap Anti-Bot

### Principe

Un humain met entre **2 et 300 secondes** pour remplir un formulaire de contact. Un bot automatisé soumet généralement en **moins de 500ms**.

Le formulaire enregistre l'heure de chargement de la page via un champ caché :

```html
<input type="hidden" name="form_loaded_at" value="[timestamp unix]">
```

Côté PHP, on vérifie :

```php
$elapsed = time() - (int)$_POST['form_loaded_at'];

if ($elapsed < 2) {
    // Soumis trop vite → bot probable
    http_response_code(400);
    die(json_encode(['error' => 'Formulaire soumis trop rapidement.']));
}

if ($elapsed > 300) {
    // Session expirée (5 minutes)
    http_response_code(400);
    die(json_encode(['error' => 'Session expirée. Veuillez recharger la page.']));
}
```

### Limites connues

- Un bot sophistiqué peut simuler un délai artificiel
- Combiné aux autres protections, le contournement reste très difficile
- Ne pas réduire la limite en dessous de 2 secondes (risque de bloquer les utilisateurs rapides sur mobile)

---

## Protection 3 — CORS Strict

### Configuration

```php
$allowed_origins = [
    'http://localhost:8000',       // Développement local
    'https://www.missticstudio.com',
    'https://missticstudio.com',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!in_array($origin, $allowed_origins)) {
    http_response_code(403);
    die(json_encode(['error' => 'Origin non autorisée.']));
}

header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
```

### Pourquoi ça compte

Sans CORS strict, n'importe quel site tiers peut envoyer des requêtes vers votre endpoint PHP via JavaScript. Cela ouvre la porte aux attaques CSRF et à l'utilisation abusive de votre formulaire depuis d'autres domaines.

### Note sur les requêtes directes

CORS est appliqué par le navigateur. Les outils comme `curl` ou Postman n'envoient pas d'en-tête `Origin` — ils ne sont donc pas bloqués par CORS. Pour bloquer ces outils, les autres protections (rate limit, time-trap, reCAPTCHA) prennent le relais.

---

## Protection 4 — Email Queue Non-Bloquante

### Problème résolu

Si le serveur SMTP est lent ou indisponible, l'ancien système bloquait la requête HTTP jusqu'à timeout (parfois 30+ secondes), donnant une mauvaise expérience utilisateur et pouvant laisser des messages perdus.

### Nouveau flux

```
1. Formulaire validé ✓
       │
       ▼
2. Email sauvegardé dans /logs/email-queue/email_[timestamp]_[hash].json
       │
       ▼
3. Réponse HTTP 200 immédiate → utilisateur voit "Message envoyé ✓"
       │
       ▼
4. Cron job toutes les 15 min → process-email-queue.php
       │
       ▼
5. Script lit les fichiers JSON, envoie via SMTP
       │
       ▼
6. Succès → fichier JSON supprimé
   Échec  → fichier conservé pour retry au prochain cron
```

### Format d'un email en queue

```json
{
  "to": "contact@missticstudio.com",
  "from": "visiteur@exemple.com",
  "name": "Jean-Pierre Tremblay",
  "subject": "Demande de devis",
  "message": "Bonjour, je souhaite...",
  "queued_at": 1713100800,
  "attempts": 0
}
```

### Configuration du cron job

```bash
# Sur PlanetHoster — panneau cPanel → Cron Jobs
*/15 * * * * /usr/bin/php /home/[user]/public_html/php/process-email-queue.php >> /home/[user]/logs/email-queue.log 2>&1
```

---

## Protection 5 — Fingerprint SHA256

### Composition

```php
$fingerprint = hash('sha256', $_SERVER['REMOTE_ADDR'] . $_SERVER['HTTP_USER_AGENT']);
```

| Composant | Exemple |
|-----------|---------|
| IP | `198.51.100.42` |
| User-Agent | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)...` |
| SHA256 résultant | `a3f8c2d1e9b47f6...` (64 chars) |

### Pourquoi SHA256 et pas IP seule

- Une IP seule est contournable avec un VPN basique
- Le User-Agent change rarement entre sessions pour un même utilisateur
- La combinaison des deux est beaucoup plus stable et unique
- SHA256 garantit qu'aucune donnée personnelle n'est stockée en clair

### Limites

- Un attaquant déterminé peut changer IP **et** User-Agent simultanément
- Derrière un NAT (réseau d'école, bureau), plusieurs utilisateurs partagent la même IP → fingerprint identique → ils partagent leur rate limit. Acceptable pour un formulaire de contact.

---

## Protection 6 — Injection Check Intelligent

### Ancien problème

L'ancienne regex rejetait des noms légitimes comme :
- `Jean-Pierre` (tiret)
- `O'Connor` (apostrophe)
- `María-José` (accents + tiret)

### Nouvelle logique

```php
function sanitizeInput(string $input): string {
    // Supprimer les caractères de contrôle
    $input = preg_replace('/[\x00-\x1F\x7F]/u', '', $input);
    // Encoder les entités HTML
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function containsDangerousPatterns(string $input): bool {
    $patterns = [
        '/<[^>]*>/i',              // Balises HTML/XML
        '/javascript\s*:/i',       // JavaScript URI
        '/on\w+\s*=/i',            // Event handlers (onclick=, onload=, etc.)
        '/\beval\s*\(/i',          // eval()
        '/union\s+select/i',       // SQL injection classique
        '/;\s*drop\s+table/i',     // SQL DROP
        '/\bexec\s*\(/i',          // exec()
        '/base64_decode\s*\(/i',   // Décodage base64 PHP
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $input)) {
            return true;
        }
    }
    return false;
}
```

### Ce qui est accepté vs rejeté

| Input | Résultat |
|-------|----------|
| `Jean-Pierre` | ✅ Accepté |
| `O'Connor` | ✅ Accepté |
| `María-José` | ✅ Accepté |
| `<script>alert(1)</script>` | ❌ Rejeté |
| `'; DROP TABLE users;--` | ❌ Rejeté |
| `onclick=malicious()` | ❌ Rejeté |
| `javascript:void(0)` | ❌ Rejeté |

---

## Protection 7 — reCAPTCHA v3

### Différence v2 vs v3

| | reCAPTCHA v2 | reCAPTCHA v3 |
|---|---|---|
| Interface | "Je ne suis pas un robot" + images | Invisible |
| UX | Interruptif | Transparent |
| Résultat | Pass/Fail | Score 0.0 → 1.0 |
| Seuil configuré | N/A | 0.5 (par défaut) |

### Flux de validation

```
1. Page chargée → Google génère un token (JS côté client)
2. Token inséré dans <input name="recaptcha_token">
3. Formulaire soumis → token envoyé au PHP
4. PHP appelle https://www.google.com/recaptcha/api/siteverify
5. Google retourne { success: true, score: 0.8, action: "submit" }
6. Score < 0.5 → rejeté | Score >= 0.5 → continué
```

### Activation

```env
# .env
RECAPTCHA_SECRET=6Lc...votre_clé_secrète
RECAPTCHA_SITE_KEY=6Lc...votre_clé_publique
```

Si `RECAPTCHA_SECRET` est absent ou vide dans `.env`, la validation reCAPTCHA est **ignorée silencieusement** — le formulaire fonctionne sans.

---

## Configuration Production

### Variables d'environnement requises

```env
# SMTP
SMTP_HOST=mail.missticstudio.com
SMTP_PORT=587
SMTP_USER=contact@missticstudio.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=contact@missticstudio.com
SMTP_FROM_NAME=Misstic Studio

# Destinataire
MAIL_TO=contact@missticstudio.com

# reCAPTCHA (optionnel)
RECAPTCHA_SECRET=
RECAPTCHA_SITE_KEY=

# Environnement
APP_ENV=production
```

### Permissions fichiers

```bash
# Répertoires logs — écriture PHP requise
chmod 755 logs/
chmod 755 logs/email-queue/

# Fichiers sensibles — non accessibles publiquement
chmod 640 .env
chmod 640 logs/rate-limit.json
```

### .htaccess recommandé

```apache
# Bloquer accès direct aux logs et à .env
<FilesMatch "\.(env|json|log)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

<DirectoryMatch "^(.*/)?logs">
    Order Allow,Deny
    Deny from all
</DirectoryMatch>
```

---

## Lecture des Logs

### security.log

```
[2026-04-14 19:32:01] RATE_LIMIT_EXCEEDED | fp=a3f8c2d1 | ip=198.51.100.42 | count=4
[2026-04-14 19:33:15] TIME_TRAP | fp=7b2e9f4a | elapsed=0.3s | ip=203.0.113.5
[2026-04-14 19:45:02] INJECTION_DETECTED | field=message | ip=192.0.2.18
[2026-04-14 20:01:44] CORS_BLOCKED | origin=https://malicious.com
[2026-04-14 20:15:30] RECAPTCHA_FAILED | score=0.2 | ip=198.51.100.99
```

### email-queue.log

```
[2026-04-14 20:00:01] Processing queue: 2 emails found
[2026-04-14 20:00:02] SUCCESS: email_1713124800_a3f8.json → contact@missticstudio.com
[2026-04-14 20:00:03] SUCCESS: email_1713124900_b2e9.json → contact@missticstudio.com
[2026-04-14 20:00:03] Queue complete: 2/2 sent
```

---

## Troubleshooting

### Erreur 500 au submit

```
1. Vérifier .env → SMTP_HOST, SMTP_PASS corrects ?
2. Vérifier permissions → logs/ writable par PHP ?
3. Activer error_log PHP temporairement :
   error_reporting(E_ALL);
   ini_set('display_errors', '1');
```

### Rate limit trop restrictif

```
# Vider manuellement le rate limit
echo '{}' > logs/rate-limit.json

# Ou supprimer une entrée spécifique en éditant le JSON
```

### Emails pas reçus

```bash
# Lancer le processeur manuellement
php php/process-email-queue.php

# Vérifier la queue
ls logs/email-queue/

# Voir les logs
tail -50 logs/email-queue.log
```

### Time-trap déclenché sur utilisateurs légitimes

Si des utilisateurs se plaignent que leur formulaire est rejeté "trop rapidement" :
- Vérifier que `form_loaded_at` est bien inséré dans le HTML au chargement
- S'assurer que l'horloge serveur est synchronisée (NTP)
- La valeur de 2 secondes peut être réduite à 1 si nécessaire (déconseillé)

### CORS bloqué en développement

Ajouter votre URL locale à la whitelist dans `contact-form.php` :

```php
$allowed_origins = [
    'http://localhost:8000',
    'http://localhost:3000',  // ← ajouter si besoin
    'http://127.0.0.1:8000',  // ← ajouter si besoin
    ...
];
```

---

*Document fait pour Misstic Studio v2.1 — Ne pas partager publiquement*