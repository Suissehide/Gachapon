import type { IocContainer } from '../../../types/application/ioc'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '../../../types/domain/user/user.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  PullUpdateInput,
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
        pityCurrent: data.pityCurrent,
        lastTokenAt: data.lastTokenAt,
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
    data: { tokens: number; dust: number; xp: number; level: number },
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

  async findAllPaginated(params: {
    page: number
    limit: number
    search?: string
  }) {
    const where = params.search
      ? {
          OR: [
            {
              username: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            },
            {
              email: { contains: params.search, mode: 'insensitive' as const },
            },
          ],
        }
      : {}
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
          suspended: true,
          createdAt: true,
        },
      }),
      this.#prisma.user.count({ where }),
    ])
    return { users, total }
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
}
