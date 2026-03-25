# Système d'emails — Design Spec

## Objectif

Mettre en place un système d'envoi d'emails transactionnels couvrant trois cas d'usage :
1. **Confirmation d'adresse email** à l'inscription (bloquant — pas de session sans vérification)
2. **Réinitialisation de mot de passe** (forgot password)
3. **Invitation d'équipe** avec suivi d'envoi et renvoi possible

Provider : SMTP via **nodemailer**. Templates : HTML minimal avec design cohérent avec l'app.

---

## Périmètre

### Hors périmètre
- Emails marketing ou notifications de jeu
- Queue asynchrone (BullMQ) — envoi synchrone suffisant
- Vérification email pour les comptes OAuth (Google/Discord déjà vérifié)

---

## Schéma de données

### Modifications `User` (`prisma/schema.prisma`)

```prisma
model User {
  // ... champs existants inchangés ...

  emailVerifiedAt                 DateTime?
  emailVerificationToken          String?   @unique
  emailVerificationTokenExpiresAt DateTime?
  passwordResetToken              String?   @unique
  passwordResetTokenExpiresAt     DateTime?
}
```

- À l'inscription email/password : `emailVerifiedAt = null`, token UUID v4 généré, TTL 24h
- À l'inscription OAuth : `emailVerifiedAt = now()`, pas de token
- Après vérification : token et expiration effacés, `emailVerifiedAt = now()`
- Reset password : token UUID v4, TTL 1h, effacé après usage

### Modification `Invitation` (`prisma/schema.prisma`)

```prisma
model Invitation {
  // ... champs existants inchangés ...

  emailSentAt DateTime?  // null si l'envoi SMTP a échoué
}
```

---

## Architecture backend

### Nouveaux fichiers

```
back/src/main/
├── types/infra/mail/
│   └── mail.service.interface.ts       # Interface IMailService
├── infra/mail/
│   ├── mail.service.ts                 # Implémentation nodemailer
│   └── templates/
│       ├── verify-email.html
│       ├── reset-password.html
│       └── team-invitation.html
```

### Interface `IMailService`

```ts
interface IMailService {
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendTeamInvitationEmail(opts: {
    to: string
    teamName: string
    inviterName: string
    token: string
  }): Promise<void>
}
```

### `MailService` (nodemailer)

- Configuré au démarrage depuis les variables d'env SMTP
- Méthode privée `render(templateName, vars)` : remplace `{{VAR}}` dans le HTML
- Les URLs dans les mails pointent vers `FRONTEND_URL`
- Si l'envoi échoue (SMTP down), l'erreur est loggée mais n'interrompt pas le flux principal sauf pour l'inscription (où on doit informer l'utilisateur)

### Variables d'environnement (ajout dans `application/config.ts`)

```
SMTP_HOST        string  required
SMTP_PORT        number  default: 587
SMTP_SECURE      boolean default: false  (true pour port 465)
SMTP_USER        string  required
SMTP_PASS        string  required
SMTP_FROM        string  required  ex: "Gachapon <noreply@gachapon.app>"
FRONTEND_URL     string  required  ex: "https://gachapon.app"
```

### IoC Container

`MailService` enregistré dans `awilix-ioc-container.ts` sous le nom `mailService`, injecté dans `AuthDomain` et `TeamDomain`.

---

## Routes HTTP

### Nouvelles routes auth (`routes/auth/index.ts`)

| Méthode | Route | Auth | Body | Description |
|---------|-------|------|------|-------------|
| `POST` | `/auth/verify-email` | non | `{ token }` | Vérifie le token, crée la session |
| `POST` | `/auth/resend-verification` | non | `{ email }` | Renvoie l'email (cooldown 2 min) |
| `POST` | `/auth/forgot-password` | non | `{ email }` | Envoie mail reset (cooldown 2 min) |
| `POST` | `/auth/reset-password` | non | `{ token, newPassword }` | Reset le mot de passe |

### Modifications routes auth existantes

**`POST /auth/register`**
- Après création du compte : génère le token de vérification, envoie l'email
- **Ne crée pas de session** — retourne `{ message: 'VERIFICATION_EMAIL_SENT', email }`
- Si SMTP échoue : retourne 500 avec message clair

**`POST /auth/login`**
- Si `emailVerifiedAt === null` (compte email/password) → retourne 403 avec code `EMAIL_NOT_VERIFIED` et l'email de l'utilisateur

### Nouvelles routes équipes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/teams/:id/invitations` | session (admin/owner) | Liste invitations PENDING avec `emailSentAt` |
| `POST` | `/invitations/:token/resend` | session (admin/owner) | Renvoie l'email d'invitation (cooldown 5 min) |

---

## Anti-spam

Double protection sur toutes les routes d'envoi d'email :

### 1. Rate limit IP (`@fastify/rate-limit`)
Appliqué uniquement sur les 4 routes d'envoi :
- Max **5 requêtes / 15 minutes** par IP
- Retourne 429 avec `Retry-After` header

### 2. Cooldown par enregistrement

| Route | Champ contrôlé | Cooldown |
|-------|---------------|---------|
| `resend-verification` | `emailVerificationTokenExpiresAt` | 2 min depuis génération |
| `forgot-password` | `passwordResetTokenExpiresAt` | 2 min depuis génération |
| `invitations/:token/resend` | `emailSentAt` | 5 min |

Réponse en cas de cooldown actif : 429 avec `{ retryAfterSeconds: N }`.

---

## Templates email HTML

Structure commune : fond `#0f0f13` (background app), carte centrale `#1a1a24`, bouton CTA primaire `#6366f1`, footer sobre avec lien de désabonnement.

| Template | Sujet | CTA |
|----------|-------|-----|
| `verify-email.html` | "Confirme ton adresse — Gachapon" | `FRONTEND_URL/verify-email?token={{TOKEN}}` |
| `reset-password.html` | "Réinitialisation de mot de passe — Gachapon" | `FRONTEND_URL/reset-password?token={{TOKEN}}` |
| `team-invitation.html` | "{{INVITER}} t'invite à rejoindre {{TEAM}} — Gachapon" | `FRONTEND_URL/invitations/{{TOKEN}}` |

---

## Frontend

### Nouvelles pages publiques

**`/verify-email?token=...`** (`routes/verify-email.tsx`)
- Appelle `POST /auth/verify-email` au montage
- États : loading → succès (redirige vers `/play` après 3s) / erreur token invalide ou expiré (avec lien "Renvoyer l'email")
- LandingNavbar

**`/reset-password?token=...`** (`routes/reset-password.tsx`)
- Formulaire : nouveau mot de passe + confirmation
- Appelle `POST /auth/reset-password`
- Succès : redirige vers `/` avec message "Mot de passe mis à jour"
- LandingNavbar

**`/forgot-password`** (`routes/forgot-password.tsx`)
- Formulaire : champ email
- Appelle `POST /auth/forgot-password`
- Affiche toujours "Si cette adresse existe, un email a été envoyé" (pas de fuite d'info)
- LandingNavbar

### Page `/pending` (modification)

Page existante étendue pour gérer deux états selon `?reason=` :

| `reason` | Icône | Titre | Message |
|----------|-------|-------|---------|
| `email` (nouveau) | Mail | "Confirme ton adresse" | "Un lien a été envoyé à `?email=...`. Clique dessus pour activer ton compte." + bouton **Renvoyer** avec countdown 2 min |
| (existant / admin) | Clock | "Compte en attente" | Message admin existant |

Bouton **Renvoyer** : appelle `POST /auth/resend-verification`, désactivé pendant le cooldown avec countdown visible.

### Modifications `AuthDialog`

**Onglet inscription :**
- Après succès : au lieu de connecter → `navigate('/pending?reason=email&email=...')`

**Onglet connexion :**
- Si erreur `EMAIL_NOT_VERIFIED` → affiche message inline "Adresse non vérifiée" + bouton "Renvoyer l'email" qui redirige vers `/pending?reason=email&email=...`

**Lien "Mot de passe oublié" :**
- Ajout sous le champ mot de passe → ouvre `/forgot-password` ou une modale légère

### Popup invitation équipe (modification)

Ajout sous le formulaire d'invitation d'un tableau des invitations PENDING :

| Colonnes | Description |
|----------|-------------|
| Destinataire | `invitedUser.username` ou `invitedEmail` |
| Invité le | `createdAt` formatée |
| Email envoyé | ✓ avec date / ✗ si null |
| Action | Bouton **Renvoyer** (désactivé si cooldown < 5 min) |

Données chargées via `GET /teams/:id/invitations`.

---

## API clients frontend (`front/src/api/`)

- `auth.api.ts` — ajout : `verifyEmail(token)`, `resendVerification(email)`, `forgotPassword(email)`, `resetPassword(token, newPassword)`
- `teams.api.ts` — ajout : `getTeamInvitations(teamId)`, `resendInvitation(token)`

---

## Cas limites

### Re-registration avant vérification
Si un utilisateur s'inscrit avec `email@x.com`, ne vérifie pas, puis essaie de s'inscrire à nouveau avec le même email :
- Si le compte existe avec `emailVerifiedAt = null` et que le token n'a pas expiré → retourner 409 "Un compte est en attente de vérification pour cet email"
- Si le token est expiré → supprimer le compte non vérifié, créer un nouveau compte et envoyer un nouveau token

### Reset password pour comptes OAuth
Les utilisateurs qui se sont inscrits uniquement via OAuth (Google/Discord) n'ont pas de `passwordHash`. Si ils appellent `/auth/forgot-password` :
- Retourner la réponse générique "Si cette adresse existe, un email a été envoyé" (pas de fuite d'info)
- Ne pas envoyer d'email — leur compte n'a pas de mot de passe à réinitialiser
- La vérification se fait côté domaine : `if (!user.passwordHash) return` silencieusement

---

## Flux complets

### Inscription email/password
1. `POST /auth/register` → compte créé, email de vérification envoyé, **pas de session**
2. Frontend → `navigate('/pending?reason=email&email=...')`
3. Utilisateur clique le lien → `GET /verify-email?token=...`
4. `POST /auth/verify-email` → session créée → redirect `/play`

### Mot de passe oublié
1. `/forgot-password` → `POST /auth/forgot-password`
2. Email envoyé → `GET /reset-password?token=...`
3. `POST /auth/reset-password` → mot de passe mis à jour, token effacé
4. Redirect `/` → connexion normale

### Invitation d'équipe
1. Admin/owner soumet le formulaire → `POST /teams/:id/invite`
2. Invitation créée + email envoyé → `emailSentAt` enregistré
3. Destinataire clique le lien → page invitation existante (`/invitations/:token`)
4. Admin peut voir les invitations PENDING et renvoyer l'email via le tableau
