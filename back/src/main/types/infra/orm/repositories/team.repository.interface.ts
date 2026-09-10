import type {
  TeamSummary,
  TeamWithMembers,
} from '../../../domain/team/team.types'
import type { PrimaTransactionClient } from '../client'

export interface ITeamRepository {
  findById(id: string): Promise<TeamWithMembers | null>
  findByUserId(userId: string): Promise<TeamSummary[]>
  countByUserId(userId: string): Promise<number>
  create(
    ownerId: string,
    data: { name: string; slug: string; description?: string },
  ): Promise<TeamWithMembers>
  /**
   * `motto` et `hue` absents = colonnes inchangées ; à `null` = colonnes
   * effacées (la teinte retombe alors sur le hachage du nom).
   */
  update(
    id: string,
    data: {
      name: string
      slug: string
      description?: string
      motto?: string | null
      hue?: number | null
    },
  ): Promise<TeamWithMembers>
  /**
   * Suppression EN TRANSACTION, seule version exposée : la cascade emporte
   * les duels et les paris de l'équipe, dont les mises déjà débitées. Le
   * remboursement et l'annulation doivent partager la transaction de la
   * suppression, sinon un échec entre les deux perd de la poussière.
   */
  deleteInTx(tx: PrimaTransactionClient, id: string): Promise<void>
}
