import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import {
  SET_BONUS_CONFIG_KEYS,
  setBonusesFromConfig,
} from '../equipment/set-bonuses'
import {
  type AttackPattern,
  type LogEntry,
  type SimulatorUnit,
  simulateBattle,
} from './battle-simulator.domain'
import { DUMMY_TEAM_KEY } from './combat-team-keys'
import type { Element } from './element'
import { buildPlayerSimUnits } from './sim-units'

/** Un mannequin tel que le joueur le règle. */
export interface DummySpec {
  element: Element | null
  def: number
  /** 0 = il encaisse sans riposter. */
  atk: number
  attackPattern: AttackPattern
}

/** Durée du combat d'entraînement, en tours à la vitesse de référence. */
export const DUMMY_TURNS = 20

const DUMMY_CONFIG_KEYS = [
  'combat.elementAdvantageMult',
  'combat.elementDisadvantageMult',
  'combat.defMitigationRef',
  'combat.baseCritRate',
  'combat.baseCritDmg',
  'combat.baseArmorPen',
  'combat.baseLifesteal',
  ...SET_BONUS_CONFIG_KEYS,
] as const

/**
 * Le mannequin réglé par le joueur, sans passif. Il joue à la vitesse de
 * référence, sinon les DoT (qui tiquent au tour de la cible) ne partiraient
 * jamais. Ses PV ne servent qu'à ne pas tomber avant la fin du chrono.
 * Sa DEF a un sens absolu : réduction = DEF / (K + DEF), K lu dans
 * `combat.defMitigationRef`. Les ennemis seedés ont DEF de base × ENEMY_DEF_MULT.
 * ponytail: PV infinis, les passifs « cible sous X % PV » ne se mesurent pas.
 */
export function trainingDummyUnit(
  spec: DummySpec,
  index: number,
): SimulatorUnit {
  return {
    id: `B${index}`,
    hp: 1_000_000_000,
    atk: spec.atk,
    def: spec.def,
    spd: 100,
    attackPattern: spec.attackPattern,
    passiveKey: null,
    element: spec.element,
    palier: 1,
    critRate: 0,
    critDmg: 100,
    armorPen: 0,
    lifesteal: 0,
  }
}

/**
 * Dégâts subis par `unitId`, avec la même règle que la scène de combat du
 * front : coups non esquivés, puis dégâts hors attaque (DoT, RIPOSTE).
 */
export function damageTaken(log: LogEntry[], unitId: string): number {
  return log.reduce((total, e) => total + entryDamage(e, unitId), 0)
}

function entryDamage(e: LogEntry, unitId: string): number {
  if (e.type === 'ATTACK') {
    return e.damages
      .filter((d) => d.id === unitId && !d.dodged)
      .reduce((sum, d) => sum + d.final, 0)
  }
  if (e.type === 'PASSIVE' && (e.targetId ?? e.unitId) === unitId) {
    return Math.max(0, e.payload.damage ?? 0)
  }
  return 0
}

export class TrainingDummyDomain {
  readonly #postgresOrm: IocContainer['postgresOrm']
  readonly #configService: IocContainer['configService']
  readonly #storageClient: IocContainer['storageClient']
  readonly #combatTeamTx: IocContainer['combatTeamTx']

  constructor({
    postgresOrm,
    configService,
    storageClient,
    combatTeamTx,
  }: Pick<
    IocContainer,
    'postgresOrm' | 'configService' | 'storageClient' | 'combatTeamTx'
  >) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#storageClient = storageClient
    this.#combatTeamTx = combatTeamTx
  }

  /** Combat à blanc de l'équipe « mannequin » : ni énergie, ni butin, ni quête. */
  async fight(userId: string, dummies: DummySpec[]) {
    const c = await this.#configService.getMany(...DUMMY_CONFIG_KEYS)
    const prisma = this.#postgresOrm.prisma
    const { userCardIds } = await this.#combatTeamTx.resolveIdsInTx(
      prisma,
      userId,
      DUMMY_TEAM_KEY,
    )
    if (userCardIds.length === 0) {
      throw Boom.badRequest(errorMessage('combat.noTeamComposed'))
    }
    const teamA = await buildPlayerSimUnits(prisma, {
      userId,
      userCardIds,
      baseStats: {
        critRate: c['combat.baseCritRate'],
        critDmg: c['combat.baseCritDmg'],
        armorPen: c['combat.baseArmorPen'],
        lifesteal: c['combat.baseLifesteal'],
      },
      setDefs: setBonusesFromConfig(c),
      publicUrl: (key) => this.#storageClient.publicUrl(key),
    })
    if (teamA.length === 0) {
      throw Boom.badRequest(errorMessage('combat.cardsNotOwnedByPlayer'))
    }
    const teamB = dummies.map((d, i) => trainingDummyUnit(d, i))
    const { log } = simulateBattle({
      teamA,
      teamB,
      seed: `${userId}:dummy:${Date.now()}`,
      timeoutTurns: DUMMY_TURNS,
      defenseK: c['combat.defMitigationRef'],
      elementAdvantageMult: c['combat.elementAdvantageMult'],
      elementDisadvantageMult: c['combat.elementDisadvantageMult'],
    })
    return {
      teamA,
      teamB,
      log,
      damageByDummy: teamB.map((u) => damageTaken(log, u.id)),
      turns: DUMMY_TURNS,
    }
  }
}
