import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '../../../domain/user/user.types'
import type { PrimaTransactionClient } from '../client'

export type PullUpdateInput = {
  tokens: number
  dustIncrement: number
  pityCurrent: number
  lastTokenAt: Date | null
}

export interface UserRepositoryInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  create(input: CreateUserInput): Promise<UserEntity>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
  delete(id: string): Promise<void>
  findByIdOrThrowInTx(
    tx: PrimaTransactionClient,
    id: string,
  ): Promise<UserEntity>
  updateAfterPullInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: PullUpdateInput,
  ): Promise<void>
  updateStreakInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: { streakDays: number; bestStreak: number; lastLoginAt: Date },
  ): Promise<void>
  updateAfterClaimInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: { tokens: number; dust: number; xp: number; level: number },
  ): Promise<void>
  findByEmailVerificationToken(token: string): Promise<UserEntity | null>
  findByPasswordResetToken(token: string): Promise<UserEntity | null>
  deleteUnverifiedByEmail(email: string): Promise<void>
}
