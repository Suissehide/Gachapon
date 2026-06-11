// back/src/main/types/domain/profile/profile.domain.interface.ts
import type { FeaturedCardDto, SetProgressionDto } from './profile.types'

export interface ProfileDomainInterface {
  getFeaturedCards(username: string): Promise<FeaturedCardDto[]>
  getSetsProgression(username: string): Promise<SetProgressionDto[]>
  setFeaturedCards(userId: string, cardIds: string[]): Promise<string[]>
}
