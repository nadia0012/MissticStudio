# 🧪 TESTING_GUIDE.md
## Misstic Studio — Guide Complet de Test

**Version:** 2.1 | **Dernière mise à jour:** 14 Avril 2026

---

## 📋 TABLE DES MATIÈRES

1. [Prérequis](#prérequis)
2. [Démarrage du serveur local](#démarrage-du-serveur-local)
3. [Test 1 — Injection Check](#test-1--injection-check)
4. [Test 2 — Time-Trap](#test-2--time-trap)
5. [Test 3 — Rate Limit](#test-3--rate-limit)
6. [Test 4 — Email Queue](#test-4--email-queue)
7. [Test 5 — CORS](#test-5--cors)
8. [Test 6 — reCAPTCHA v3](#test-6--recaptcha-v3)
9. [Test 7 — Fingerprint](#test-7--fingerprint)
10. [Tests End-to-End](#tests-end-to-end)
11. [Checklist finale avant déploiement](#checklist-finale-avant-déploiement)

---

## Prérequis

Avant de commencer les tests, s'assurer que :

```bash
# PHP 8.0+ installé
php --version

# Répertoires créés
mkdir -p logs/email-queue

# Permissions correctes
chmod 755 logs/
chmod 755 logs/email-queue/

# .env configuré (au minimum)
cp .env.example .env
# Éditer .env avec vos vraies valeurs SMTP
```

---

## Démarrage du serveur local

```bash
# Depuis la racine du projet
php -S localhost:8000

# Vérifier que c'est accessible
# → Ouvrir http://localhost:8000/contact.html dans le navigateur
```

Garder un terminal ouvert sur les logs pendant les tests :

```bash
# Terminal séparé
tail -f logs/security.log
```

---

## Test 1 — Injection Check

### Objectif
Vérifier que les noms composés légitimes sont acceptés, et que les tentatives d'injection sont rejetées.

### 1A — Noms légitimes (doivent être acceptés ✅)

Remplir le formulaire avec ces valeurs dans le champ **Nom** :

| Valeur testée | Résultat attendu |
|---------------|-----------------|
| `Jean-Pierre` | ✅ Accepté |
| `O'Connor` | ✅ Accepté |
| `María-José` | ✅ Accepté |
| `Anne-Sophie Tremblay` | ✅ Accepté |
| `D'Artagnan` | ✅ Accepté |

**Procédure :**
1. Aller sur `http://localhost:8000/contact.html`
2. Nom : `Jean-Pierre`, Email : `test@test.com`, Message : `Test injection légitime`
3. Soumettre (attendre 3+ secondes après chargement)
4. ✅ Résultat attendu : message de succès affiché

---

### 1B — Injections (doivent être rejetées ❌)

Tester via `curl` pour contourner l'interface :

```bash
# Test XSS
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=<script>alert(1)</script>&email=test@test.com&message=test&form_loaded_at=$(date -v-5S +%s)"

# Résultat attendu: {"error":"Caractères non autorisés détectés."}

# Test SQL Injection
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=test&email=test@test.com&message='; DROP TABLE users;--&form_loaded_at=$(date -v-5S +%s)"

# Résultat attendu: {"error":"Caractères non autorisés détectés."}

# Test event handler
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=test&email=test@test.com&message=<img onclick=alert(1)>&form_loaded_at=$(date -v-5S +%s)"

# Résultat attendu: {"error":"Caractères non autorisés détectés."}
```

---

## Test 2 — Time-Trap

### Objectif
Vérifier que les soumissions trop rapides (bots) sont rejetées.

### 2A — Soumission trop rapide (doit être rejetée ❌)

```bash
# Simuler un timestamp "maintenant" → formulaire soumis instantanément
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Bot&email=bot@test.com&message=Je suis un bot&form_loaded_at=$(date +%s)"

# Résultat attendu: {"error":"Formulaire soumis trop rapidement. Veuillez réessayer."}
```

### 2B — Session expirée (doit être rejetée ❌)

```bash
# Simuler un timestamp vieux de 10 minutes
EXPIRED_TS=$(($(date +%s) - 600))
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Session expirée&form_loaded_at=$EXPIRED_TS"

# Résultat attendu: {"error":"Session expirée. Veuillez recharger la page."}
```

### 2C — Délai légitime (doit être accepté ✅)

```bash
# Simuler un formulaire chargé il y a 5 secondes
VALID_TS=$(($(date +%s) - 5))
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Humain&email=humain@test.com&message=Message légitime&form_loaded_at=$VALID_TS"

# Résultat attendu: {"success":true} (ou erreur SMTP si pas configuré, ce qui est normal)
```

---

## Test 3 — Rate Limit

### Objectif
Vérifier que la 4ème soumission dans la même heure est rejetée avec HTTP 429.

### Procédure

```bash
# Préparer un timestamp valide (5 secondes dans le passé)
VALID_TS=$(($(date +%s) - 5))

# Soumission 1 — doit passer ✅
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Message 1&form_loaded_at=$VALID_TS"
echo "--- Soumission 1 ---"

# Soumission 2 — doit passer ✅
VALID_TS=$(($(date +%s) - 5))
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Message 2&form_loaded_at=$VALID_TS"
echo "--- Soumission 2 ---"

# Soumission 3 — doit passer ✅
VALID_TS=$(($(date +%s) - 5))
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Message 3&form_loaded_at=$VALID_TS"
echo "--- Soumission 3 ---"

# Soumission 4 — doit être bloquée ❌ (HTTP 429)
VALID_TS=$(($(date +%s) - 5))
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Message 4&form_loaded_at=$VALID_TS"
echo "--- Soumission 4 (doit être 429) ---"
```

**Résultat attendu soumission 4 :**
```
HTTP/1.1 429 Too Many Requests
{"error":"Trop de tentatives. Réessayez dans une heure."}
```

### Vérifier le fichier rate-limit.json

```bash
cat logs/rate-limit.json
# Doit montrer count: 3 pour votre fingerprint
```

### Reset pour tests suivants

```bash
echo '{}' > logs/rate-limit.json
```

---

## Test 4 — Email Queue

### Objectif
Vérifier que les emails sont sauvegardés en JSON et envoyés par le processeur de queue.

### 4A — Vérifier la sauvegarde

Après une soumission valide :

```bash
# Lister les emails en queue
ls -la logs/email-queue/

# Doit afficher quelque chose comme :
# email_1713124800_a3f8c2d1.json

# Lire le contenu
cat logs/email-queue/email_*.json
```

**Contenu attendu :**
```json
{
  "to": "contact@missticstudio.com",
  "from": "test@test.com",
  "name": "Test",
  "subject": "Nouveau message de Test",
  "message": "Message test",
  "queued_at": 1713124800,
  "attempts": 0
}
```

### 4B — Lancer le processeur manuellement

```bash
php php/process-email-queue.php
```

**Résultat attendu :**
```
Processing queue: 1 emails found
SUCCESS: email_1713124800_a3f8.json → contact@missticstudio.com
Queue complete: 1/1 sent
```

### 4C — Vérifier la suppression après envoi

```bash
ls logs/email-queue/
# Doit être vide après envoi réussi
```

> ⚠️ **Note :** Si SMTP n'est pas configuré, le script affichera une erreur mais le fichier sera conservé pour retry. C'est le comportement attendu.

---

## Test 5 — CORS

### Objectif
Vérifier que les origins non autorisées sont bloquées.

### 5A — Origin non autorisée (doit être bloquée ❌)

```bash
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: https://site-malveillant.com" \
  -d "name=Test&email=test@test.com&message=Test CORS"

# Résultat attendu : HTTP 403
# {"error":"Origin non autorisée."}
```

### 5B — Origin autorisée (doit passer ✅)

```bash
curl -i -X POST http://localhost:8000/php/contact-form.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Test CORS valide&form_loaded_at=$(($(date +%s) - 5))"

# Résultat attendu : HTTP 200 (ou erreur de validation autre que CORS)
```

### 5C — Préflight OPTIONS

```bash
curl -i -X OPTIONS http://localhost:8000/php/contact-form.php \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: POST"

# Résultat attendu : HTTP 200 avec headers CORS
# Access-Control-Allow-Origin: http://localhost:8000
# Access-Control-Allow-Methods: POST
```

---

## Test 6 — reCAPTCHA v3

### Si reCAPTCHA non configuré

Sans clé dans `.env`, la validation est ignorée silencieusement. Le formulaire doit fonctionner normalement.

```bash
# Vérifier que .env n'a pas de RECAPTCHA_SECRET
grep RECAPTCHA_SECRET .env
# Doit être vide ou absent

# Soumettre sans token reCAPTCHA → doit quand même passer
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Origin: http://localhost:8000" \
  -d "name=Test&email=test@test.com&message=Sans recaptcha&form_loaded_at=$(($(date +%s) - 5))"

# Résultat attendu : succès (pas d'erreur reCAPTCHA)
```

### Si reCAPTCHA configuré

1. Aller sur `http://localhost:8000/contact.html`
2. Ouvrir la console navigateur (F12)
3. Vérifier que le script reCAPTCHA est chargé :
   ```
   reCAPTCHA loaded successfully
   ```
4. Soumettre le formulaire normalement
5. Dans la console, vérifier le token généré :
   ```
   reCAPTCHA token: 03AGdBq2...
   ```

### Simuler un score faible (test avancé)

Modifier temporairement dans `contact-form.php` le seuil à 1.0 pour forcer l'échec :
```php
// Temporaire pour test
if ($recaptcha_score < 1.0) {
```
→ Tout devrait être rejeté. Remettre à 0.5 après test.

---

## Test 7 — Fingerprint

### Objectif
Vérifier que le fingerprint est unique et persistant entre requêtes.

```bash
# Première requête
VALID_TS=$(($(date +%s) - 5))
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Origin: http://localhost:8000" \
  -H "User-Agent: TestAgent/1.0" \
  -d "name=FP Test&email=fp@test.com&message=Test fingerprint&form_loaded_at=$VALID_TS"

# Vérifier le rate-limit.json — doit avoir 1 entrée avec count=1
cat logs/rate-limit.json

# Deuxième requête avec même User-Agent → même fingerprint → count=2
VALID_TS=$(($(date +%s) - 5))
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Origin: http://localhost:8000" \
  -H "User-Agent: TestAgent/1.0" \
  -d "name=FP Test&email=fp@test.com&message=Test fingerprint 2&form_loaded_at=$VALID_TS"

cat logs/rate-limit.json
# Même clé, count=2

# Requête avec User-Agent différent → fingerprint différent → nouvelle entrée
VALID_TS=$(($(date +%s) - 5))
curl -X POST http://localhost:8000/php/contact-form.php \
  -H "Origin: http://localhost:8000" \
  -H "User-Agent: AutreAgent/2.0" \
  -d "name=FP Test&email=fp@test.com&message=Test fingerprint autre UA&form_loaded_at=$VALID_TS"

cat logs/rate-limit.json
# Deux clés différentes dans le JSON
```

---

## Tests End-to-End

### Scénario 1 — Utilisateur légitime

1. Ouvrir `http://localhost:8000/contact.html`
2. Attendre 3 secondes
3. Remplir : Nom `Marie-Claire Dubois`, Email `marie@test.com`, Message `Bonjour, je souhaite un devis pour un logo.`
4. Cliquer Envoyer
5. ✅ Message de succès affiché
6. ✅ Fichier JSON créé dans `logs/email-queue/`
7. ✅ `php php/process-email-queue.php` envoie l'email

---

### Scénario 2 — Bot rapide

1. Via curl, soumettre sans délai (`form_loaded_at` = timestamp actuel)
2. ❌ Rejeté par Time-Trap

---

### Scénario 3 — Spam répété

1. Soumettre 3 fois avec délai valide
2. ✅ Les 3 passent
3. Soumettre une 4ème fois
4. ❌ HTTP 429 — Rate limit atteint

---

### Scénario 4 — Attaque XSS

1. Envoyer `<script>document.cookie</script>` dans le champ message
2. ❌ Injection détectée, rejeté

---

### Scénario 5 — SMTP en panne

1. Mettre un faux SMTP_HOST dans `.env`
2. Soumettre le formulaire
3. ✅ L'utilisateur reçoit quand même une confirmation (queue)
4. ✅ L'email est sauvegardé dans `logs/email-queue/`
5. Corriger SMTP_HOST, lancer `php php/process-email-queue.php`
6. ✅ Email envoyé, fichier supprimé

---

## Checklist finale avant déploiement

```
□ Test 1A : Noms composés acceptés (Jean-Pierre, O'Connor)
□ Test 1B : Injections rejetées (<script>, DROP TABLE)
□ Test 2A : Soumission < 2s rejetée
□ Test 2B : Session > 5 min rejetée
□ Test 2C : Délai normal accepté
□ Test 3  : 4ème soumission → HTTP 429
□ Test 4A : Email sauvegardé en JSON
□ Test 4B : process-email-queue.php fonctionne
□ Test 4C : Fichier queue supprimé après envoi
□ Test 5A : Origin inconnue → HTTP 403
□ Test 5B : Origin autorisée → passe
□ Test 6  : reCAPTCHA cohérent (si activé)
□ Test 7  : Fingerprints distincts par UA

□ .env configuré avec vraies credentials PlanetHoster
□ Cron job configuré (*/15 * * * *)
□ .htaccess protège /logs et .env
□ Test end-to-end complet en production
```

---

*Document fait pour Misstic Studio v2.1 — Ne pas partager publiquement*