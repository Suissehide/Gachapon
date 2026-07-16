import type { IocContainer } from '../../../types/application/ioc'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '../../../types/domain/user/user.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  AdminUsersWhereInput,
  PullUpdateInput,
  UserExportRow,
  UserRepositoryInterface,
} from '../../../types/infra/orm/repositories/user.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserRepository implements UserRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { email } })
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { username } })
  }

  create(input: CreateUserInput): Promise<UserEntity> {
    return this.#prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        tokens: input.tokens,
      },
    })
  }

  update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    return this.#prisma.user.update({ where: { id }, data: input })
  }

  async updateFeaturedCardIds(
    userId: string,
    cardIds: string[],
  ): Promise<void> {
    await this.#prisma.user.update({
      where: { id: userId },
      data: { featuredCardIds: cardIds },
    })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.user.delete({ where: { id } })
  }

  findByIdOrThrowInTx(
    tx: PrimaTransactionClient,
    id: string,
  ): Promise<UserEntity> {
    return tx.user.findUniqueOrThrow({ where: { id } })
  }

  async updateAfterPullInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: PullUpdateInput,
  ): Promise<void> {
    await tx.user.update({
      where: { id },
      data: {
        tokens: data.tokens,
        dust: { increment: data.dustIncrement },
        dustGenerated: { increment: data.dustIncrement },
        xp: { increment: data.xpIncrement },
        level: data.newLevel,
        pityCurrent: data.pityCurrent,
        lastTokenAt: data.lastTokenAt,
        ...(data.skillPointsIncrement !== undefined
          ? { skillPoints: { increment: data.skillPointsIncrement } }
          : {}),
      },
    })
  }

  async updateStreakInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: { streakDays: number; bestStreak: number; lastLoginAt: Date },
  ): Promise<void> {
    await tx.user.update({ where: { id }, data })
  }

  async updateAfterClaimInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: {
      tokens: number
      dust: number
      xp: number
      gold?: number
      level: number
      lastTokenAt?: Date
      skillPoints?: { increment: number }
    },
  ): Promise<void> {
    await tx.user.update({ where: { id }, data })
  }

  findByEmailVerificationToken(token: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({
      where: { emailVerificationToken: token },
    })
  }

  findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({
      where: { passwordResetToken: token },
    })
  }

  async deleteUnverifiedByEmail(email: string): Promise<void> {
    await this.#prisma.user.deleteMany({
      where: { email, emailVerifiedAt: null },
    })
  }

  #buildAdminWhere(params: AdminUsersWhereInput) {
    const where: Record<string, unknown> = {}
    if (params.search) {
      where.OR = [
        { username: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }
    if (params.status) {
      where.suspended = params.status === 'suspended'
    }
    this.#applyDateRange(
      where,
      'createdAt',
      params.createdFrom,
      params.createdTo,
    )
    this.#applyNumericRange(where, 'level', params.levelMin, params.levelMax)
    this.#applyDateRange(
      where,
      'lastLoginAt',
      params.lastLoginFrom,
      params.lastLoginTo,
    )
    return where
  }

  #applyDateRange(
    where: Record<string, unknown>,
    field: string,
    from?: Date,
    to?: Date,
  ) {
    if (!from && !to) {
      return
    }
    where[field] = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  #applyNumericRange(
    where: Record<string, unknown>,
    field: string,
    min?: number,
    max?: number,
  ) {
    if (!min && !max) {
      return
    }
    where[field] = {
      ...(min ? { gte: min } : {}),
      ...(max ? { lte: max } : {}),
    }
  }

  async findAllPaginated(
    params: AdminUsersWhereInput & { page: number; limit: number },
  ) {
    const where = this.#buildAdminWhere(params)
    const [users, total] = await Promise.all([
      this.#prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          tokens: true,
          dust: true,
          gold: true,
          level: true,
          suspended: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      this.#prisma.user.count({ where }),
    ])
    return { users, total }
  }

  async findAllActiveIds(): Promise<string[]> {
    const rows = await this.#prisma.user.findMany({
      where: { suspended: false },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }

  findAllForExport(filters: AdminUsersWhereInput): Promise<UserExportRow[]> {
    return this.#prisma.user.findMany({
      where: this.#buildAdminWhere(filters),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        suspended: true,
        level: true,
        tokens: true,
        dust: true,
        gold: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })
  }

  searchByUsername(q: string, excludeId: string) {
    return this.#prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        id: { not: excludeId },
      },
      select: { id: true, username: true, avatar: true },
      take: 5,
      orderBy: { username: 'asc' },
    })
  }

  async incrementTokens(
    id: string,
    amount: number,
  ): Promise<{ tokens: number }> {
    const updated = await this.#prisma.user.update({
      where: { id },
      data: { tokens: { increment: amount } },
    })
    return { tokens: updated.tokens }
  }

  async incrementDust(id: string, amount: number): Promise<{ dust: number }> {
    const updated = await this.#prisma.user.update({
      where: { id },
      data: { dust: { increment: amount } },
    })
    return { dust: updated.dust }
  }

  async updateRole(
    id: string,
    role: 'USER' | 'SUPER_ADMIN',
  ): Promise<{ role: string }> {
    const updated = await this.#prisma.user.update({
      where: { id },
      data: { role },
    })
    return { role: updated.role }
  }

  async updateSuspended(
    id: string,
    suspended: boolean,
  ): Promise<{ suspended: boolean }> {
    const updated = await this.#prisma.user.update({
      where: { id },
      data: { suspended },
    })
    return { suspended: updated.suspended }
  }

  findManyByIds(
    ids: string[],
  ): Promise<
    { id: string; username: string; level: number; avatar: string | null }[]
  > {
    return this.#prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, level: true, avatar: true },
    })
  }
}
