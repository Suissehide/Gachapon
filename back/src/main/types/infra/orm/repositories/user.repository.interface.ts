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
  xpIncrement: number
  newLevel: number
  skillPointsIncrement?: number
}

export type AdminUsersWhereInput = {
  search?: string
  status?: 'active' | 'suspended'
  createdFrom?: Date
  createdTo?: Date
  levelMin?: number
  levelMax?: number
  lastLoginFrom?: Date
  lastLoginTo?: Date
}

export type UserExportRow = {
  id: string
  username: string
  email: string
  role: string
  suspended: boolean
  level: number
  tokens: number
  dust: number
  gold: number
  createdAt: Date
  lastLoginAt: Date | null
}

export interface UserRepositoryInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  create(input: CreateUserInput): Promise<UserEntity>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
  updateFeaturedCardIds(userId: string, cardIds: string[]): Promise<void>
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
    data: {
      tokens: number
      dust: number
      xp: number
      level: number
      gold?: number
      lastTokenAt?: Date
      skillPoints?: { increment: number }
    },
  ): Promise<void>
  findByEmailVerificationToken(token: string): Promise<UserEntity | null>
  findByPasswordResetToken(token: string): Promise<UserEntity | null>
  deleteUnverifiedByEmail(email: string): Promise<void>
  findAllPaginated(
    params: AdminUsersWhereInput & { page: number; limit: number },
  ): Promise<{
    users: (Pick<
      UserEntity,
      | 'id'
      | 'username'
      | 'email'
      | 'role'
      | 'tokens'
      | 'dust'
      | 'suspended'
      | 'createdAt'
    > & { level: number; lastLoginAt: Date | null; gold: number })[]
    total: number
  }>
  findAllActiveIds(): Promise<string[]>
  findAllForExport(filters: AdminUsersWhereInput): Promise<UserExportRow[]>
  searchByUsername(
    q: string,
    excludeId: string,
  ): Promise<Pick<UserEntity, 'id' | 'username' | 'avatar'>[]>
  incrementTokens(id: string, amount: number): Promise<{ tokens: number }>
  incrementDust(id: string, amount: number): Promise<{ dust: number }>
  updateRole(
    id: string,
    role: 'USER' | 'SUPER_ADMIN',
  ): Promise<{ role: string }>
  updateSuspended(
    id: string,
    suspended: boolean,
  ): Promise<{ suspended: boolean }>
  findManyByIds(
    ids: string[],
  ): Promise<
    { id: string; username: string; level: number; avatar: string | null }[]
  >
}
