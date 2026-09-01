import type {
  CardElement,
  TowerFloor,
  UserTowerProgress,
} from '../../../../../generated/client'

export interface ITowerRepository {
  listFloors(element: CardElement): Promise<TowerFloor[]>
  findFloor(element: CardElement, index: number): Promise<TowerFloor | null>
  getProgress(userId: string): Promise<UserTowerProgress[]>
  upsertProgress(
    userId: string,
    element: CardElement,
    highestFloor: number,
  ): Promise<UserTowerProgress>
}
