import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { ApiKeyRepository } from '../../infra/orm/repositories/api-key.repository'
import type { CardRepository } from '../../infra/orm/repositories/card.repository'
import type { GachaPullRepository } from '../../infra/orm/repositories/gacha-pull.repository'
import type { InvitationRepository } from '../../infra/orm/repositories/invitation.repository'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { SkillTreeRepository } from '../../infra/orm/repositories/skill-tree.repository'
import type { UserCardRepository } from '../../infra/orm/repositories/user-card.repository'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { AuthDomainInterface } from '../domain/auth/auth.domain.interface'
import type { OAuthDomainInterface } from '../domain/auth/oauth.domain.interface'
import type { ICollectionDomain } from '../domain/collection/collection.domain.interface'
import type { AdminSkillTreeDomain } from '../../domain/skills/admin-skill-tree.domain'
import type { ISkillTreeDomain, ISkillInvestDomain, ISkillResetDomain } from '../domain/skills/skill-tree.domain.interface'
import type { GachaDomainInterface } from '../domain/gacha/gacha.domain.interface'
import type { RewardsDomainInterface } from '../domain/rewards/rewards.domain.interface'
import type { IShopDomain } from '../domain/shop/shop.domain.interface'
import type { StreakDomainInterface } from '../domain/streak/streak.domain.interface'
import type { TeamDomainInterface } from '../domain/team/team.domain.interface'
import type { UserDomainInterface } from '../domain/user/user.domain.interface'
import type { JwtServiceInterface } from '../infra/auth/jwt.service'
import type { ConfigServiceInterface } from '../infra/config/config.service.interface'
import type { HttpClientInterface } from '../infra/http/http-client'
import type { IMailService } from '../infra/mail/mail.service.interface'
import type { IAchievementRepository } from '../infra/orm/repositories/achievement.repository.interface'
import type { IAdminStatsRepository } from '../infra/orm/repositories/admin-stats.repository.interface'
import type { ILeaderboardRepository } from '../infra/orm/repositories/leaderboard.repository.interface'
import type { IQuestRepository } from '../infra/orm/repositories/quest.repository.interface'
import type { RewardRepositoryInterface } from '../infra/orm/repositories/reward.repository.interface'
import type { IScoringConfigRepository } from '../infra/orm/repositories/scoring-config.repository.interface'
import type { IShopItemRepository } from '../infra/orm/repositories/shop-item.repository.interface'
import type { IStatsRepository } from '../infra/orm/repositories/stats.repository.interface'
import type { StreakMilestoneRepositoryInterface } from '../infra/orm/repositories/streak-milestone.repository.interface'
import type { UserRepositoryInterface } from '../infra/orm/repositories/user.repository.interface'
import type { UserRewardRepositoryInterface } from '../infra/orm/repositories/user-reward.repository.interface'
import type { RedisClientInterface } from '../infra/redis/redis-client'
import type { StorageClientInterface } from '../infra/storage/storage-client'
import type { HttpServer } from '../interfaces/http/server'
import type { ErrorHandlerInterface } from '../utils/error-handler'
import type { Logger } from '../utils/logger'
import type { Config } from './config'

export interface IocContainer {
  readonly config: Config
  readonly httpServer: HttpServer
  readonly httpClient: HttpClientInterface
  readonly logger: Logger
  readonly errorHandler: ErrorHandlerInterface
  readonly postgresOrm: PostgresOrm
  readonly configService: ConfigServiceInterface
  readonly redisClient: RedisClientInterface
  readonly storageClient: StorageClientInterface
  readonly jwtService: JwtServiceInterface
  readonly userRepository: UserRepositoryInterface
  readonly userDomain: UserDomainInterface
  readonly authDomain: AuthDomainInterface
  readonly oauthDomain: OAuthDomainInterface
  readonly refreshTokenRepository: RefreshTokenRepository
  readonly oauthAccountRepository: OAuthAccountRepository
  readonly apiKeyRepository: ApiKeyRepository
  readonly cardRepository: CardRepository
  readonly userCardRepository: UserCardRepository
  readonly gachaPullRepository: GachaPullRepository
  readonly skillTreeRepository: SkillTreeRepository
  readonly scoringConfigRepository: IScoringConfigRepository
  readonly gachaDomain: GachaDomainInterface
  readonly teamRepository: TeamRepository
  readonly teamMemberRepository: TeamMemberRepository
  readonly invitationRepository: InvitationRepository
  readonly teamDomain: TeamDomainInterface
  readonly mailService: IMailService
  readonly rewardRepository: RewardRepositoryInterface
  readonly streakMilestoneRepository: StreakMilestoneRepositoryInterface
  readonly userRewardRepository: UserRewardRepositoryInterface
  readonly streakDomain: StreakDomainInterface
  readonly rewardsDomain: RewardsDomainInterface
  readonly questRepository: IQuestRepository
  readonly achievementRepository: IAchievementRepository
  readonly shopItemRepository: IShopItemRepository
  readonly leaderboardRepository: ILeaderboardRepository
  readonly statsRepository: IStatsRepository
  readonly adminStatsRepository: IAdminStatsRepository
  readonly collectionDomain: ICollectionDomain
  readonly shopDomain: IShopDomain
  readonly skillTreeDomain: ISkillTreeDomain
  readonly skillInvestDomain: ISkillInvestDomain
  readonly skillResetDomain: ISkillResetDomain
  readonly adminSkillTreeDomain: AdminSkillTreeDomain
}
