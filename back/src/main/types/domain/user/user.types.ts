import type { User } from '../../../../generated/client'
import type { Locale } from '../../../infra/i18n/locale'

export type UserEntity = User

/**
 * `locale` est OBLIGATOIRE, pas `?: Locale` avec un défaut implicite côté
 * repository : la colonne a un défaut Prisma (`EN`), mais un défaut
 * silencieux ici aurait exactement recréé le bug de la tâche 7 — tout
 * compte né sans qu'on y pense reste en anglais à vie tant que le lot 2
 * (changement de langue depuis le profil) n'existe pas. Le type oblige
 * chaque appelant de `userRepository.create()` à décider explicitement
 * (voir `auth.domain.ts#register` et `oauth.domain.ts#handleCallback`, les
 * deux seuls call sites — `getCurrentLocale()` y est le bon choix : c'est
 * la locale de la requête d'inscription elle-même).
 */
export type CreateUserInput = {
  username: string
  email: string
  passwordHash?: string
  tokens?: number
  locale: Locale
}

export type UpdateUserInput = Partial<
  Pick<
    User,
    | 'username'
    | 'avatar'
    | 'banner'
    | 'tokens'
    | 'dust'
    | 'lastTokenAt'
    | 'xp'
    | 'level'
    | 'pityCurrent'
    | 'streakDays'
    | 'lastLoginAt'
    | 'role'
    | 'emailVerifiedAt'
    | 'emailVerificationToken'
    | 'emailVerificationTokenExpiresAt'
    | 'passwordResetToken'
    | 'passwordResetTokenExpiresAt'
    | 'passwordHash'
  >
>
