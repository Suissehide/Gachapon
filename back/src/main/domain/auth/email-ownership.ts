import type { UserEntity } from '../../types/domain/user/user.types'

export type EmailOwnerStatus = 'free' | 'verified' | 'pending' | 'stale'

export type EmailOwnerLike = Pick<
  UserEntity,
  'emailVerifiedAt' | 'passwordHash' | 'emailVerificationTokenExpiresAt'
>

/**
 * Règle partagée par les 4 points d'entrée qui décident du sort d'un email
 * déjà présent en base (`AuthDomain#register`, `AuthDomain#convertGuest`,
 * `GuestDomain#requestEmailUpgrade`, `OAuthDomain#linkGuest`). Avant cette
 * extraction, chaque site réimplémentait la même logique à la main : un
 * oubli isolé pouvait supprimer un compte qu'un autre site aurait protégé
 * (revue de la tâche 6 — un compte né par OAuth, ou déjà rattaché par un
 * invité, pouvait être effacé par un simple `POST /auth/register` sur son
 * email).
 *
 * - `free` : aucun compte sur cet email, rien ne bloque.
 * - `verified` : BLOQUE — email confirmé, OU compte né par OAuth
 *   (`passwordHash === null`) : un compte OAuth-only n'a jamais de mot de
 *   passe à vérifier, donc jamais d'`emailVerifiedAt` ni de jeton, mais il
 *   est possédé — jamais éphémère.
 * - `pending` : BLOQUE — inscription par mot de passe non vérifiée, jeton
 *   encore valide (quelqu'un peut encore la confirmer).
 * - `stale` : NE BLOQUE PAS — inscription par mot de passe non vérifiée et
 *   jeton manquant/expiré : ligne éphémère. L'appelant doit la supprimer
 *   (`userRepository.deleteUnverifiedByEmail`) puis continuer.
 */
export function classifyEmailOwner(
  owner: EmailOwnerLike | null,
  now: Date = new Date(),
): EmailOwnerStatus {
  if (!owner) {
    return 'free'
  }
  if (owner.emailVerifiedAt !== null || owner.passwordHash === null) {
    return 'verified'
  }
  const expiresAt = owner.emailVerificationTokenExpiresAt
  if (expiresAt && expiresAt > now) {
    return 'pending'
  }
  return 'stale'
}
