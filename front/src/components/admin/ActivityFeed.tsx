import dayjs from 'dayjs'
import type { LucideIcon } from 'lucide-react'
import {
  Crown,
  Gem,
  Gift,
  ShieldBan,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { ActivityEvent } from '../../api/admin-activity.api.ts'
import { apiUrl } from '../../constants/config.constant.ts'
import { wsClient } from '../../lib/ws'
import { useAdminActivity } from '../../queries/useAdminActivity.ts'
import { Button } from '../ui/button.tsx'
import { Card, CardContent } from '../ui/card.tsx'

const EVENT_META: Record<
  string,
  { icon: LucideIcon; label: (e: ActivityEvent) => string; tone: string }
> = {
  USER_SIGNUP: {
    icon: UserPlus,
    label: (e) => `${e.user?.username ?? 'Un joueur'} s'est inscrit`,
    tone: 'text-success',
  },
  PULL_LEGENDARY: {
    icon: Crown,
    label: (e) =>
      `${e.user?.username} a tiré ${String(e.payload?.cardName ?? 'une légendaire')}`,
    tone: 'text-rarity-legendary',
  },
  PULL_EPIC: {
    icon: Gem,
    label: (e) =>
      `${e.user?.username} a tiré ${String(e.payload?.cardName ?? 'une épique')}`,
    tone: 'text-rarity-epic',
  },
  SHOP_PURCHASE: {
    icon: ShoppingBag,
    label: (e) => `${e.user?.username ?? 'Un joueur'} a fait un achat boutique`,
    tone: 'text-info',
  },
  USER_SUSPENDED: {
    icon: ShieldBan,
    label: (e) => `${e.user?.username ?? 'Un compte'} a été suspendu`,
    tone: 'text-destructive',
  },
  USER_UNSUSPENDED: {
    icon: ShieldCheck,
    label: (e) => `${e.user?.username ?? 'Un compte'} a été réactivé`,
    tone: 'text-success',
  },
  ADMIN_GRANT: {
    icon: Gift,
    label: (e) => `Grant admin pour ${e.user?.username ?? 'un joueur'}`,
    tone: 'text-primary',
  },
  BULK_REWARD: {
    icon: Sparkles,
    label: (e) =>
      `Récompense envoyée à ${String(e.payload?.count ?? '?')} joueurs`,
    tone: 'text-primary',
  },
  LEVEL_UP: {
    icon: TrendingUp,
    label: (e) =>
      `${e.user?.username ?? 'Un joueur'} passe niveau ${String(e.payload?.to ?? '?')}`,
    tone: 'text-accent',
  },
}

export function ActivityFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminActivity()
  const [live, setLive] = useState<ActivityEvent[]>([])

  useEffect(() => {
    wsClient.connect(apiUrl)
    return wsClient.on((event) => {
      if (event.type !== 'admin:activity') {
        return
      }
      setLive((prev) => [event.event, ...prev].slice(0, 50))
    })
  }, [])

  const historical = data?.pages.flatMap((p) => p.events) ?? []
  const seen = new Set<string>()
  const events = [...live, ...historical].filter((e) => {
    if (seen.has(e.id)) {
      return false
    }
    seen.add(e.id)
    return true
  })

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-text-light">
          Activité récente
        </p>
        <div className="flex max-h-[480px] flex-col gap-1 overflow-y-auto">
          {events.length === 0 && (
            <p className="py-6 text-center text-xs text-text-light">
              Aucune activité pour le moment
            </p>
          )}
          {events.map((e) => {
            const meta = EVENT_META[e.type]
            if (!meta) {
              return null
            }
            const Icon = meta.icon
            return (
              <div
                key={e.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{meta.label(e)}</p>
                  <p className="text-[11px] text-text-light">
                    {dayjs(e.createdAt).fromNow()}
                  </p>
                </div>
              </div>
            )
          })}
          {hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              Charger plus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
