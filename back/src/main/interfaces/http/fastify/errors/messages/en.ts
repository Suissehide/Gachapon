import type { ErrorMessageKey } from './keys'

/**
 * Catalogue anglais des messages d'erreur. Typé en `Record<ErrorMessageKey,
 * string>` sur le référentiel de clés du français (voir `keys.ts`) : une clé
 * oubliée ici casse `npm run build`, par construction — aucun repli vers le
 * français pour le texte de code, contrairement au contenu de jeu.
 */
export const EN_MESSAGES: Record<ErrorMessageKey, string> = {
  'user.notFound': 'User not found',
  'user.usernameTaken': 'This username is already taken',
  'team.maxTeamsPerUser': 'Maximum {{max}} teams per user',

  // --- auth ---
  'auth.emailAlreadyInUse': 'Email already in use',
  'auth.unverifiedAccountPending':
    'An account is pending verification for this email',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.emailNotVerified': 'EMAIL_NOT_VERIFIED',
  'auth.invalidOrExpiredToken': 'Invalid or expired token',
  'auth.invalidOrExpiredRefreshToken': 'Invalid or expired refresh token',
  'auth.refreshTokenRevoked': 'Refresh token revoked',
  'auth.resendCooldown': 'Please wait before resending an email',
  'auth.unknownProvider': 'Unknown provider',
  'auth.oauthTokenExchangeFailed': 'OAuth provider token exchange failed',
  'auth.oauthUserinfoFailed': 'OAuth provider userinfo fetch failed',
  'auth.invalidApiKey': 'Invalid API key',
  'auth.accountSuspended': 'Account suspended',
  'auth.noAccessToken': 'No access token',
  'auth.notAuthenticated': 'Not authenticated',
  'auth.insufficientPermissions': 'Insufficient permissions',
  'auth.noRefreshToken': 'No refresh token',
  'auth.oauthMissingCodeOrState': 'Missing code or state',
  'auth.oauthInvalidState': 'Invalid OAuth state',

  // --- profile / admin users ---
  'profile.cardNotInCollection': 'Card not in your collection',
  'admin.cannotChangeOwnRole': 'Cannot change your own role',
  'admin.cannotSuspendSelf': 'Cannot suspend your own account',
}
