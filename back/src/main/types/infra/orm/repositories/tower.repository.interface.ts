import type {
  CardElement,
  TowerFloor,
  UserTowerProgress,
} from '../../../../../generated/client'

export interface ITowerRepository {
  listFloors(element: CardElement): Promise<TowerFloor[]>
  getProgress(userId: string): Promise<UserTowerProgress[]>
}
