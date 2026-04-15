# Misstic Studio Website

Site web officiel du studio indie Misstic Studio à Montréal.

## 📁 Structure du projet

```
├── index.html                 # Page d'accueil
├── contact.html              # Page de contact avec formulaire
├── craftiny.html             # Page du jeu Craftiny
├── sunrise-order.html        # Page du jeu Sunrise Order
│
├── css/
│   └── style.css             # Styles CSS principal
│
├── js/
│   └── script.js             # JavaScript frontend (interactions, animations)
│
├── images/                   # Images du site
│   ├── Logo_MissticStudio_Purple.png
│   └── ...
│
├── videos/                   # Vidéos de Sunrise's Order
│
├── php/                      # Backend PHP
│   ├── contact-form.php      # Traitement du formulaire de contact
│   ├── get-csrf-token.php    # Génération tokens CSRF
│   ├── init-form.php         # Initialisation sessions
│   └── process-email-queue.php # Traitement queue emails
│
├── config/                   # Configuration
│   └── .env                  # Variables d'environnement
│
├── logs/                     # Logs d'application
│   ├── security.log          # Logs de sécurité
│   ├── rate-limit.json       # Rate limiting storage
│   └── archive/              # Anciens emails archivés
│
├── docs/                     # Documentation technique
│   ├── SECURITY.md           # Guide de sécurité
│   └── TESTING.md            # Guide de test
│
├── vendor/                   # Dépendances (Composer)
│   └── phpmailer/            # Pour l'envoi d'emails
│
├── composer.json             # Configuration Composer
├── .env                      # Variables d'environnement
└── .gitignore               # Fichiers à ignorer en git
```

## 🛡️ Sécurité

Le formulaire de contact implémente plusieurs couches de sécurité:

- **CSRF Protection**: Tokens expirés après 1 heure
- **Rate Limiting**: Max 10 soumissions par heure par IP
- **Time-Trap**: Détection des bots (soumissions dans les 24h)
- **Honeypot**: Champ anti-spam invisible
- **reCAPTCHA v3**: Vérification côté serveur
- **Input Sanitization**: Validation stricte des champs
- **File Upload Security**: Types MIME vérifiés, taille limitée (5MB max)

## 📧 Configuration Email

Le site utilise PHPMailer pour l'envoi d'emails. Deux options disponibles:

### Option 1: Gmail (Développement/Test)

1. Créer une [App Password Gmail](https://support.google.com/accounts/answer/185833)
2. Configurer `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=app-password-16-caracteres
EMAIL_TO=votre-email@gmail.com
FORM_SECRET=any-random-string
```

### Option 2: Planethoster (Production)

1. Vérifier l'email SMTP dans Planethoster Control Panel
2. Mettre à jour `.env`:

```env
SMTP_HOST=mail.planethoster.net
SMTP_PORT=587
SMTP_USER=contact@missticstudio.com
SMTP_PASS=your-planethoster-password
EMAIL_TO=contact@missticstudio.com
FORM_SECRET=your-secret-key
RECAPTCHA_SECRET=your-recaptcha-secret  # Optionnel
```

**Voir `.env.example` pour plus de détails.**

## 🚀 Déploiement

1. **Dépendances**: `composer install`
2. **Permissions**: `logs/` doit être writable
3. **Variables d'environnement**: Configurer `.env`
4. **HTTPS**: Obligatoire en production

## 🐛 Troubleshooting

- **Error 500 au formulaire**: Vérifier les logs dans `logs/security.log`
- **Emails non reçus**: Vérifier `logs/archive/` (email queue)
- **Formulaire bloqué**: Attendre 1h (rate limit) ou vérifier token CSRF
