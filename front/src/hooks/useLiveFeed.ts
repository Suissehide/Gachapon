import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api'
import { wsClient } from '../lib/ws'
import type { FeedEntry } from '../types/feed'

export type { FeedEntry }

export function useLiveFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const seeded = useRef(false)

  const { data: seedEntries } = useQuery({
    queryKey: ['pulls', 'recent'],
    queryFn: () => GachaApi.getRecentPulls(20),
    staleTime: 60_000,
  })

  // Initialiser avec les données DB une seule fois
  useEffect(() => {
    if (seedEntries && !seeded.current) {
      setEntries(seedEntries)
      seeded.current = true
    }
  }, [seedEntries])

  // Souscrire aux events WS live
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.type !== 'feed:pull') return
      const entry: FeedEntry = {
        username: event.username,
        cardName: event.cardName,
        rarity: event.rarity,
        variant: event.variant,
        cardId: event.cardId,
        imageUrl: event.imageUrl,
        setName: event.setName,
        pulledAt: event.pulledAt,
      }
      setEntries((prev) => [entry, ...prev].slice(0, 50))
    })
  }, [])

  return { entries }
}
