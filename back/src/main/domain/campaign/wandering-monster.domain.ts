import type { IocContainer } from '../../types/application/ioc'
import type {
  IWanderingMonsterDomain,
  WandererView,
} from '../../types/domain/campaign/wandering-monster.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { type EnemySpec, enemyTeamSchema } from './campaign.domain'
import { computeTeamPower } from './campaign-power'
import {
  enemyNameFromAppearance,
  genericEnemyName,
  resolveEnemyImageUrl,
} from './enemy-appearance'
import {
  pickMonsterStage,
  pickSpawnDelayMinutes,
} from './wandering-monster-rules'

export class WanderingMonsterDomain implements IWanderingMonsterDomain {
  readonly #postgresOrm: IocContainer['postgresOrm']
  readonly #configService: IocContainer['configService']
  readonly #storageClient: IocContainer['storageClient']
  readonly #config: IocContainer['config']

  constructor({
    postgresOrm,
    configService,
    storageClient,
    config,
  }: Pick<
    IocContainer,
    'postgresOrm' | 'configService' | 'storageClient' | 'config'
  >) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#storageClient = storageClient
    this.#config = config
  }

  async scheduleInTx(
    tx: PrimaTransactionClient,
    userId: string,
    now: Date,
  ): Promise<void> {
    // Pas de ligne UserCampaignProgress => compte neuf, jamais entré en
    // campagne : aucun monstre (règle « pas de monstre sans étage battu »).
    const progress = await tx.userCampaignProgress.findUnique({
      where: { userId },
    })
    if (!progress) {
      return
    }

    const stages = await tx.campaignStage.findMany({
      select: { id: true, chapter: true, index: true },
    })
    const picked = pickMonsterStage(stages, progress, Math.random)
    if (!picked) {
      return
    }

    const cfg = await this.#configService.getMany(
      'wanderer.minDelayMinutes',
      'wanderer.maxDelayMinutes',
      'wanderer.durationMinutes',
    )
    const delayMinutes = pickSpawnDelayMinutes(
      cfg['wanderer.minDelayMinutes'],
      cfg['wanderer.maxDelayMinutes'],
      Math.random,
    )
    const appearsAt = new Date(now.getTime() + delayMinutes * 60_000)
    const expiresAt = new Date(
      appearsAt.getTime() + cfg['wanderer.durationMinutes'] * 60_000,
    )
    const day = now.toISOString().slice(0, 10)

    // skipDuplicates sur (userId, day) : un deuxième /auth/me le même jour
    // ne recrée jamais la ligne (idempotent).
    await tx.wanderingMonster.createMany({
      data: [{ userId, day, stageId: picked.id, appearsAt, expiresAt }],
      skipDuplicates: true,
    })
  }

  async findActive(userId: string, now: Date): Promise<WandererView | null> {
    // Un monstre de la veille qui déborde encore sur la fenêtre du jour est
    // le plus ancien (expiresAt le plus proche) : orderBy le fait ressortir
    // en premier s'il y en avait deux (il ne peut pas y en avoir deux actifs
    // en pratique, une apparition par jour, mais la règle le garantit).
    const wm = await this.#postgresOrm.prisma.wanderingMonster.findFirst({
      where: {
        userId,
        appearsAt: { lte: now },
        expiresAt: { gt: now },
        defeatedAt: null,
      },
      orderBy: { expiresAt: 'asc' },
      include: { stage: true },
    })
    if (!wm) {
      return null
    }

    const enemyTeam = enemyTeamSchema.parse(wm.stage.enemyTeam)
    const head: EnemySpec | undefined = enemyTeam[0]
    return {
      stageId: wm.stageId,
      chapter: wm.stage.chapter,
      index: wm.stage.index,
      stageLabel: wm.stage.label,
      expiresAt: wm.expiresAt.toISOString(),
      name: head
        ? (enemyNameFromAppearance(head.appearance) ?? genericEnemyName(1))
        : genericEnemyName(1),
      imageUrl: head ? this.#resolveEnemyImage(head.appearance) : null,
      element: head?.element ?? null,
      recommendedPower: computeTeamPower(enemyTeam),
    }
  }

  // Même résolution que CampaignDomain#resolveEnemyImage : préfixe d'env
  // (staging/ en dev) sur la même clé MinIO cards/<appearance>.png.
  #resolveEnemyImage(appearance: string | null | undefined): string | null {
    return resolveEnemyImageUrl(
      appearance,
      (key) => this.#storageClient.publicUrl(key),
      this.#config.isDevelopment ? 'staging/' : '',
    )
  }
}
