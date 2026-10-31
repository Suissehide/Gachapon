import type { CapsuleType, UserCapsule } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export interface IUserCapsuleRepository {
  findByUser(userId: string): Promise<UserCapsule[]>
  findInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
  ): Promise<UserCapsule | null>
  creditInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
    quantity: number,
  ): Promise<void>
  /**
   * Décrémente `quantity` de `quantity` (conditionnel : `quantity >= n`) et
   * pose `pityCurrent` dans le MÊME update — le tirage astral calcule la
   * nouvelle valeur de pitié (incrémentée ou remise à 0) avant d'appeler
   * cette méthode, pour que consommation et pitié avancent atomiquement.
   * Lève `Boom.paymentRequired` si aucune ligne n'a été touchée (capsules
   * insuffisantes, ou aucune ligne du tout).
   */
  consumeInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
    quantity: number,
    pityCurrent: number,
  ): Promise<void>
}
