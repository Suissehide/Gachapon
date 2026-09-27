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
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { UnlockedAchievement } from '../achievements/events.types'
import { generateGuestUsername } from './guest-username'

// 5 tirages à 2 chiffres (6 400 combinaisons × 100), puis 5 à 4 chiffres.
const USERNAME_ATTEMPTS: (2 | 4)[] = [2, 2, 2, 2, 2, 4, 4, 4, 4, 4]

export class GuestDomain implements GuestDomainInterface {
  readonly #userRepository: UserRepositoryInterface
  readonly #authDomain: AuthDomainInterface
  readonly #configService: ConfigServiceInterface
  readonly #activityDomain: IActivityDomain
  readonly #streakDomain: StreakDomainInterface
  readonly #postgresOrm: PostgresOrm

  constructor({
    userRepository,
    authDomain,
    configService,
    activityDomain,
    streakDomain,
    postgresOrm,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#authDomain = authDomain
    this.#configService = configService
    this.#activityDomain = activityDomain
    this.#streakDomain = streakDomain
    this.#postgresOrm = postgresOrm
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
}
