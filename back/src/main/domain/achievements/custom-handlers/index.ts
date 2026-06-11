import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { AchievementEvent, AchievementEventKind } from '../events.types'

export interface CustomHandlerResult {
  unlocked: boolean
  progress?: number
}

export interface CustomHandler {
  listensTo: AchievementEventKind[]
  evaluate: (
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ) => Promise<CustomHandlerResult>
}

export const customHandlers: Record<string, CustomHandler> = {}

export const listCustomHandlerKeys = (): string[] => Object.keys(customHandlers)

export const getCustomHandler = (key: string): CustomHandler | undefined =>
  customHandlers[key]

import { firstPullEverHandler } from './first-pull-ever'
customHandlers.first_pull_ever = firstPullEverHandler

import { fourRaritiesOneDayHandler } from './four-rarities-one-day'
customHandlers.four_rarities_one_day = fourRaritiesOneDayHandler
