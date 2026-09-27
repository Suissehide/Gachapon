import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { Locale } from '../../infra/i18n/locale'
import { getCurrentLocale } from '../../infra/i18n/locale-context'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type { IActivityDomain } from '../../types/domain/activity/activity.domain.interface'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface'
import type {
  GuestDomainInterface,
  GuestSession,
} from '../../types/domain/auth/guest.domain.interface'
import type { StreakDomainInterface } from '../../types/domain/streak/streak.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { UnlockedAchievement } from '../achievements/events.types'
import { classifyEmailOwner } from './email-ownership'
import { guestPurgeCutoff } from './guest-rules'
import { generateGuestUsername } from './guest-username'

// 5 tirages à 2 chiffres (6 400 combinaisons × 100), puis 5 à 4 chiffres.
const USERNAME_ATTEMPTS: (2 | 4)[] = [2, 2, 2, 2, 2, 4, 4, 4, 4, 4]

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const COOLDOWN_MS = 2 * 60 * 1000

/** 409 avec `code: 'EMAIL_TAKEN'` : le front propose alors de se connecter. */
export const emailTaken = (message: string) => {
  const err = Boom.conflict(message)
  Object.assign(err.output.payload, { code: 'EMAIL_TAKEN' })
  return err
}

export class GuestDomain implements GuestDomainInterface {
  readonly #userRepository: UserRepositoryInterface
  readonly #authDomain: AuthDomainInterface
  readonly #configService: ConfigServiceInterface
  readonly #activityDomain: IActivityDomain
  readonly #streakDomain: StreakDomainInterface
  readonly #postgresOrm: PostgresOrm
  readonly #mailService: IMailService

  constructor({
    userRepository,
    authDomain,
    configService,
    activityDomain,
    streakDomain,
    postgresOrm,
    mailService,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#authDomain = authDomain
    this.#configService = configService
    this.#activityDomain = activityDomain
    this.#streakDomain = streakDomain
    this.#postgresOrm = postgresOrm
    this.#mailService = mailService
  }

  async createGuest(): Promise<GuestSession> {
    const locale = getCurrentLocale()
    const username = await this.#freeUsername(locale)
    const tokenMaxStock = await this.#configService.get('tokenMaxStock')
    const user = await this.#userRepository.create({
      username,
      email: null,
      role: 'GUEST',
      tokens: tokenMaxStock,
      locale,
    })

    void this.#activityDomain.record('GUEST_SIGNUP', {
      userId: user.id,
      username: user.username,
      payload: { username: user.username },
    })

    let unlockedAchievements: UnlockedAchievement[] = []
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        unlockedAchievements = await this.#streakDomain.updateStreak(
          user.id,
          tx,
        )
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }

    const fresh = (await this.#userRepository.findById(user.id)) ?? user
    const tokens = await this.#authDomain.generateTokenPair(fresh)
    return { user: fresh, tokens, unlockedAchievements }
  }

  async #freeUsername(locale: Locale): Promise<string> {
    for (const digits of USERNAME_ATTEMPTS) {
      const candidate = generateGuestUsername(locale, digits)
      if (!(await this.#userRepository.findByUsername(candidate))) {
        return candidate
      }
    }
    throw Boom.serverUnavailable(errorMessage('auth.guestUsernameUnavailable'))
  }

  async requestEmailUpgrade(
    userId: string,
    input: { email: string; password: string },
  ): Promise<{ pendingEmail: string }> {
    const user = await this.#userRepository.findById(userId)
    if (!user || user.role !== 'GUEST') {
      throw Boom.forbidden(errorMessage('auth.guestOnly'))
    }
    // Même délai que resendVerification : le jeton courant a été émis à
    // (expiration - TTL).
    if (user.emailVerificationTokenExpiresAt) {
      const issuedAt =
        user.emailVerificationTokenExpiresAt.getTime() -
        VERIFICATION_TOKEN_TTL_MS
      const elapsed = Date.now() - issuedAt
      if (elapsed < COOLDOWN_MS) {
        throw Boom.tooManyRequests(errorMessage('auth.resendCooldown'), {
          retryAfterSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
        })
      }
    }
    // Le normalizerExtension n'abaisse que `email` : `pendingEmail` est
    // normalisé ici, pour que la copie vers `email` au clic reste cohérente.
    const email = input.email.toLowerCase()
    // Même règle qu'`AuthDomain#register` (`classifyEmailOwner`, partagée) :
    // un compte possédé (vérifié, ou né par OAuth) bloque, un compte non
    // vérifié dont le jeton a expiré est éphémère et cède la place (sinon
    // une inscription jamais confirmée squatterait l'email à vie et
    // bloquerait toute conversion future).
    const existing = await this.#userRepository.findByEmail(email)
    const emailStatus = classifyEmailOwner(existing)
    if (emailStatus === 'verified') {
      throw emailTaken(errorMessage('auth.emailAlreadyInUse'))
    }
    if (emailStatus === 'pending') {
      throw Boom.conflict(errorMessage('auth.unverifiedAccountPending'))
    }
    if (emailStatus === 'stale') {
      await this.#userRepository.deleteUnverifiedByEmail(email)
    }
    const token = randomUUID()
    await this.#userRepository.update(user.id, {
      pendingEmail: email,
      passwordHash: await this.#authDomain.hashPassword(input.password),
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_TTL_MS,
      ),
    })
    await this.#mailService.sendVerificationEmail(email, token, user.locale)
    return { pendingEmail: email }
  }

  async purgeInactiveGuests(): Promise<number> {
    const days = await this.#configService.get('guest.purgeAfterDays')
    return this.#userRepository.deleteInactiveGuests(
      guestPurgeCutoff(new Date(), days),
    )
  }
}
