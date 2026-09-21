import type {
  CardElement,
  UserTowerProgress,
} from '../../../../../generated/client'
import type { LocalizedTowerFloor } from '../localized'

export interface ITowerRepository {
  listFloors(element: CardElement): Promise<LocalizedTowerFloor[]>
  getProgress(userId: string): Promise<UserTowerProgress[]>
}
