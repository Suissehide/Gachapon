import type { IocContainer } from '../../types/application/ioc'
import type {
  IWanderingMonsterDomain,
  WandererView,
} from '../../types/domain/campaign/wandering-monster.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { retryOnSerialization } from '../shared/retry-serialization'
import { computeTeamPower } from './campaign-power'
import {
  enemyNameFromAppearance,
  genericEnemyName,
  resolveEnemyImageUrl,
} from './enemy-appearance'
import {
  activeWandererQuery,
  nextWandererAppearsAt,
  pickMonsterStage,
  pickSpawnDelayMinutes,
  wandererSoloEnemy,
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

  async findActive(userId: string, now: Date): Promise<WandererView | null> {
    // Serializable : deux lectures simultanées ne planifient qu'un passage.
    const wm = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          await this.#scheduleNextInTx(tx, userId, now)
          return tx.wanderingMonster.findFirst({
            ...activeWandererQuery(userId, now),
            include: { stage: true },
          })
        },
        { isolationLevel: 'Serializable' },
      ),
    )
    if (!wm) {
      return null
    }

    const solo = wandererSoloEnemy(wm.stage)
    return {
      stageId: wm.stageId,
      chapter: wm.stage.chapter,
      index: wm.stage.index,
      stageLabel: wm.stage.label,
      expiresAt: wm.expiresAt.toISOString(),
      name: enemyNameFromAppearance(solo.appearance) ?? genericEnemyName(1),
      imageUrl: this.#resolveEnemyImage(solo.appearance),
      element: solo.element ?? null,
      recommendedPower: computeTeamPower([solo]),
    }
  }

  /**
   * Planifie le passage suivant quand le dernier est terminé (parti ou
   * vaincu) : le monstre revient en boucle, `wanderer.durationMinutes` à
   * chaque passage. Rien tant qu'un passage est à venir ou en cours.
   */
  async #scheduleNextInTx(
    tx: PrimaTransactionClient,
    userId: string,
    now: Date,
  ): Promise<void> {
    const last = await tx.wanderingMonster.findFirst({
      where: { userId },
      orderBy: { appearsAt: 'desc' },
    })
    if (last && last.defeatedAt === null && last.expiresAt > now) {
      return
    }

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
    const durationMinutes = cfg['wanderer.durationMinutes']
    const appearsAt = nextWandererAppearsAt(
      last ? (last.defeatedAt ?? last.expiresAt) : null,
      now,
      pickSpawnDelayMinutes(
        cfg['wanderer.minDelayMinutes'],
        cfg['wanderer.maxDelayMinutes'],
        Math.random,
      ),
      durationMinutes,
    )
    await tx.wanderingMonster.create({
      data: {
        userId,
        stageId: picked.id,
        appearsAt,
        expiresAt: new Date(appearsAt.getTime() + durationMinutes * 60_000),
      },
    })
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
