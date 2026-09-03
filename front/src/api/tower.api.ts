import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { BattleLogEntry, SimulatorUnit } from './combat.api.ts'
import type { EquipmentDrop, EquipmentSlot } from './equipment.api.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

// Les 4 éléments qui ont une tour (§6 design spec, TOWER_ELEMENTS côté back
// — back/src/main/domain/tower/tower-slots.ts). LIGHT et DARK n'en ont pas et
// restent des jokers neutres : ne jamais élargir ce type au CardElement complet.
export type TowerElement = 'FIRE' | 'WATER' | 'NATURE' | 'EARTH'

export type TowerFloorStatus = 'cleared' | 'current' | 'locked'

export type TowerSummary = {
  element: TowerElement
  /** Nom propre de la tour (« Tour de Braise »), renvoyé par le back. */
  name: string
  // Slot alimenté par cette tour — renvoyé par le back (TOWER_SLOT_BY_ELEMENT),
  // jamais recopié ici : voir l'avertissement dans tower-slots.ts côté back.
  slot: EquipmentSlot
  highestFloor: number
  totalFloors: number
}

export type TowerFloorEnemy = {
  id: string
  imageUrl: string | null
  power: number
  element: string | null
}

export type TowerFloorView = {
  index: number
  label: string
  isBoss: boolean
  status: TowerFloorStatus
  recommendedPower: number
  enemies: TowerFloorEnemy[]
}

export type TowerView = {
  element: TowerElement
  name: string
  highestFloor: number
  floors: TowerFloorView[]
}

export type TowerBattleRewards = {
  gold: number
  dust: number
  xp: number
  xpBefore: number
  levelBefore: number
  isFirstClear: boolean
  // Toujours présent quand `rewards` n'est pas null : la tour garantit une
  // pièce par run (§6 design spec), contrairement à la campagne — voir le
  // commentaire de towerBattleResponseSchema côté back.
  equipmentDrop: EquipmentDrop
}

export type TowerBattleResult = {
  won: boolean
  log: BattleLogEntry[]
  rewards: TowerBattleRewards | null
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
}

export async function fetchTowers(): Promise<{ towers: TowerSummary[] }> {
  const res = await fetchWithAuth(`${apiUrl}/tower`)
  if (!res.ok) {
    handleHttpError(res, {}, 'Erreur lors du chargement des tours')
  }
  return res.json()
}

export async function fetchTower(element: string): Promise<TowerView> {
  const res = await fetchWithAuth(`${apiUrl}/tower/${element}`)
  if (!res.ok) {
    handleHttpError(res, {}, 'Erreur lors du chargement de la tour')
  }
  return res.json()
}

export async function postTowerBattle(
  element: string,
  floor: number,
  userCardIds: string[],
): Promise<TowerBattleResult> {
  const res = await fetchWithAuth(
    `${apiUrl}/tower/${element}/${floor}/battle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCardIds }),
    },
  )
  if (!res.ok) {
    handleHttpError(res, {}, 'Erreur lors du combat')
  }
  return res.json()
}
