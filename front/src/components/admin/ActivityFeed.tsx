import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
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
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { ActivityEvent } from '../../api/admin-activity.api.ts'
import { apiUrl } from '../../constants/config.constant.ts'
import { wsClient } from '../../lib/ws'
import { useAdminActivity } from '../../queries/useAdminActivity.ts'
import { Button } from '../ui/button.tsx'
import { Card, CardContent } from '../ui/card.tsx'

/**
 * Élément `<username>` du `<Trans>` de chaque événement : un lien vers le
 * profil quand l'événement porte un vrai joueur, un `<span>` inerte pour le
 * texte de repli (« Un joueur », « Un compte »…) qui ne pointe vers rien.
 *
 * Remplace l'ancien mécanisme — construire la phrase en français puis
 * deviner après coup, par `startsWith`/`endsWith`, où se trouvait le nom
 * d'utilisateur pour le rendre cliquable — qui ne survivait pas à la
 * traduction anglaise (l'ordre des mots change selon l'événement).
 */
function usernameComponent(username: string | undefined): ReactElement {
  return username ? (
    <Link
      to="/profile/$username"
      params={{ username }}
      className="hover:underline"
    />
  ) : (
    <span />
  )
}

type EventRenderer = (e: ActivityEvent, t: TFunction<'admin'>) => ReactNode

const EVENT_META: Record<
  string,
  { icon: LucideIcon; tone: string; render: EventRenderer }
> = {
  USER_SIGNUP: {
    icon: UserPlus,
    tone: 'text-success',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.USER_SIGNUP"
        values={{ name: e.user?.username ?? t('activityFeed.fallbackPlayer') }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  PULL_LEGENDARY: {
    icon: Crown,
    tone: 'text-rarity-legendary',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.PULL_LEGENDARY"
        values={{
          name: e.user?.username,
          cardName: String(
            e.payload?.cardName ?? t('activityFeed.fallbackLegendaryCard'),
          ),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  PULL_EPIC: {
    icon: Gem,
    tone: 'text-rarity-epic',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.PULL_EPIC"
        values={{
          name: e.user?.username,
          cardName: String(
            e.payload?.cardName ?? t('activityFeed.fallbackEpicCard'),
          ),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  SHOP_PURCHASE: {
    icon: ShoppingBag,
    tone: 'text-info',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.SHOP_PURCHASE"
        values={{ name: e.user?.username ?? t('activityFeed.fallbackPlayer') }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  USER_SUSPENDED: {
    icon: ShieldBan,
    tone: 'text-destructive',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.USER_SUSPENDED"
        values={{
          name: e.user?.username ?? t('activityFeed.fallbackAccount'),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  USER_UNSUSPENDED: {
    icon: ShieldCheck,
    tone: 'text-success',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.USER_UNSUSPENDED"
        values={{
          name: e.user?.username ?? t('activityFeed.fallbackAccount'),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  ADMIN_GRANT: {
    icon: Gift,
    tone: 'text-primary',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.ADMIN_GRANT"
        values={{
          name: e.user?.username ?? t('activityFeed.fallbackPlayerLower'),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
  BULK_REWARD: {
    icon: Sparkles,
    tone: 'text-primary',
    render: (e, t) =>
      t('activityFeed.events.BULK_REWARD', {
        count: e.payload?.count ?? t('activityFeed.unknownCount'),
      }),
  },
  LEVEL_UP: {
    icon: TrendingUp,
    tone: 'text-accent',
    render: (e, t) => (
      <Trans
        t={t}
        i18nKey="activityFeed.events.LEVEL_UP"
        values={{
          name: e.user?.username ?? t('activityFeed.fallbackPlayer'),
          level: String(e.payload?.to ?? '?'),
        }}
        components={{ username: usernameComponent(e.user?.username) }}
      />
    ),
  },
}

export function ActivityFeed() {
  const { t } = useTranslation('admin')
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
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
          {t('activityFeed.title')}
        </p>
        <div className="flex max-h-[480px] flex-col gap-1 overflow-y-auto">
          {isPending &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, never reordered
                key={i}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5"
              >
                <div className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded bg-border" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-border" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-border" />
                </div>
              </div>
            ))}
          {!isPending && events.length === 0 && (
            <p className="py-6 text-center text-xs text-text-light">
              {t('activityFeed.empty')}
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
                  <p className="truncate text-sm text-text">
                    {meta.render(e, t)}
                  </p>
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
              {t('activityFeed.loadMore')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
