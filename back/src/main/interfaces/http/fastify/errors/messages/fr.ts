/**
 * Catalogue français des messages d'erreur — texte de code, pas contenu de
 * jeu. Sert de référentiel de clés pour `ErrorMessageKey` (voir `keys.ts`) :
 * toute clé ajoutée ici doit recevoir sa traduction dans `en.ts`, sous peine
 * d'échec de compilation.
 *
 * Convention de nommage : `<domaine>.<sujet>`, jamais le texte du message
 * (voir task-6-brief.md). Un message identique dans deux endroits du code
 * partage la même clé ; deux messages qui se ressemblent mais signalent des
 * échecs différents reçoivent des clés distinctes.
 */
export const FR_MESSAGES = {
  'user.notFound': 'Utilisateur introuvable',
  'user.usernameTaken': 'Ce pseudo est déjà pris',
  'team.maxTeamsPerUser': 'Maximum {{max}} équipes par utilisateur',

  // --- auth ---
  'auth.emailAlreadyInUse': 'Email déjà utilisé',
  'auth.unverifiedAccountPending':
    'Un compte est en attente de vérification pour cet email',
  'auth.invalidCredentials': 'Identifiants invalides',
  // Code technique lu par le front (voir front/src/api/auth.api.ts), pas un
  // message affiché — identique dans les deux langues, comme tout sentinel.
  'auth.emailNotVerified': 'EMAIL_NOT_VERIFIED',
  'auth.invalidOrExpiredToken': 'Token invalide ou expiré',
  'auth.invalidOrExpiredRefreshToken':
    'Jeton de rafraîchissement invalide ou expiré',
  'auth.refreshTokenRevoked': 'Le jeton de rafraîchissement a été révoqué',
  'auth.resendCooldown': 'Veuillez patienter avant de renvoyer un email',
  'auth.unknownProvider': 'Fournisseur inconnu',
  'auth.oauthTokenExchangeFailed':
    'Échec de l’échange du jeton auprès du fournisseur OAuth',
  'auth.oauthUserinfoFailed':
    'Échec de récupération du profil auprès du fournisseur OAuth',
  'auth.invalidApiKey': 'Clé API invalide',
  'auth.accountSuspended': 'Compte suspendu',
  'auth.noAccessToken': 'Aucun jeton d’accès',
  'auth.notAuthenticated': 'Non authentifié',
  'auth.insufficientPermissions': 'Permissions insuffisantes',
  'auth.noRefreshToken': 'Aucun jeton de rafraîchissement',
  'auth.oauthMissingCodeOrState': 'Code ou état manquant',
  'auth.oauthInvalidState': 'État OAuth invalide',

  // --- profile / admin users ---
  'profile.cardNotInCollection': 'Cette carte n’est pas dans ta collection',
  'admin.cannotChangeOwnRole': 'Impossible de modifier son propre rôle',
  'admin.cannotSuspendSelf': 'Impossible de suspendre son propre compte',
} as const
