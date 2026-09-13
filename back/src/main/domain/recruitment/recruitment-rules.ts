import type { JoinRequestStatus } from '../../../generated/client'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 7 jours, contre 48 h pour une invitation (`INVITATION_TTL_MS`). Une
 * invitation est poussée vers quelqu'un qui l'attend ; une candidature dort
 * dans la file d'un chef qui ne l'attendait pas.
 */
export const JOIN_REQUEST_TTL_MS = 7 * DAY_MS

/** Délai avant de pouvoir recandidater après un refus. */
export const JOIN_REQUEST_COOLDOWN_MS = 7 * DAY_MS

/** Sans plafond, rien n'empêche de candidater à l'annuaire entier d'un coup. */
export const MAX_PENDING_JOIN_REQUESTS = 5

export function isJoinRequestExpired(
  req: { status: JoinRequestStatus; expiresAt: Date },
  now: Date,
): boolean {
  return req.status === 'PENDING' && req.expiresAt.getTime() <= now.getTime()
}

/**
 * Date avant laquelle le joueur ne peut pas recandidater, ou `null` s'il n'y a
 * aucun verrou. Le cooldown ne se déclenche que sur un REFUS : un ex-membre
 * qui se ravise (ligne `ACCEPTED`) ou quelqu'un qui a annulé peut recandidater
 * aussitôt.
 */
export function reapplyBlockedUntil(
  req: { status: JoinRequestStatus; decidedAt: Date | null } | null,
): Date | null {
  if (!req || req.status !== 'DECLINED' || !req.decidedAt) {
    return null
  }
  return new Date(req.decidedAt.getTime() + JOIN_REQUEST_COOLDOWN_MS)
}

export function countActivePending(
  reqs: { status: JoinRequestStatus; expiresAt: Date }[],
  now: Date,
): number {
  return reqs.filter(
    (req) => req.status === 'PENDING' && !isJoinRequestExpired(req, now),
  ).length
}
