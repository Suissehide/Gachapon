import { describe, expect, it, jest } from '@jest/globals'

import { ActivityDomain } from '../../main/domain/activity/activity.domain'

const makeDeps = (overrides: Record<string, unknown> = {}) =>
  ({
    activityEventRepository: {
      create: jest.fn(async () => {}),
      list: jest.fn(async () => ({ events: [], nextCursor: null })),
      deleteOlderThan: jest.fn(async () => 3),
    },
    wsManager: { notifyAdmins: jest.fn() },
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    ...overrides,
  }) as any

describe('ActivityDomain', () => {
  it('record insère puis push aux admins', async () => {
    const deps = makeDeps()
    const domain = new ActivityDomain(deps)
    await domain.record('USER_SIGNUP', {
      userId: 'u1',
      username: 'leo',
      payload: { via: 'email' },
    })
    expect(deps.activityEventRepository.create).toHaveBeenCalledWith({
      type: 'USER_SIGNUP',
      userId: 'u1',
      payload: { via: 'email' },
    })
    expect(deps.wsManager.notifyAdmins).toHaveBeenCalledTimes(1)
  })

  it('record ne throw jamais si le repo échoue', async () => {
    const deps = makeDeps({
      activityEventRepository: {
        create: jest.fn(async () => {
          throw new Error('db down')
        }),
      },
    })
    const domain = new ActivityDomain(deps)
    await expect(domain.record('USER_SIGNUP', {})).resolves.toBeUndefined()
    expect(deps.logger.warn).toHaveBeenCalled()
    expect(deps.wsManager.notifyAdmins).not.toHaveBeenCalled()
  })

  it('purgeOlderThanDays calcule la date limite', async () => {
    const deps = makeDeps()
    const domain = new ActivityDomain(deps)
    const count = await domain.purgeOlderThanDays(30)
    expect(count).toBe(3)
    const arg = (deps.activityEventRepository.deleteOlderThan as jest.Mock).mock
      .calls[0][0] as Date
    const expectedMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    expect(Math.abs(arg.getTime() - expectedMs)).toBeLessThan(5000)
  })
})
