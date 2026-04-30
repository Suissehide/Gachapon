import { createFileRoute } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay'
import type { DailyShopItem } from '../../constants/daily-shop.constant'
import { useBuyDailyShopItem, useDailyShop } from '../../queries/useDailyShop'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/daily-shop')({
  component: DailyShopPage,
})

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const midnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      ))
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return timeLeft
}

function DailyShopPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { data, isLoading } = useDailyShop()
  const { mutate: buy, isPending: buying } = useBuyDailyShopItem()
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const timeLeft = useCountdown()

  const dust = user?.dust ?? 0
  const items = data?.items ?? []

  const handleBuy = (item: DailyShopItem) => {
    setBuyingId(item.id)
    buy(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustBalance })
        }
        setNotification(`✓ ${result.card.name} obtenue ! −${result.dustSpent} poussière`)
        setTimeout(() => setNotification(null), 3000)
        setBuyingId(null)
      },
      onError: (err) => {
        setNotification(`✗ ${err.message}`)
        setTimeout(() => setNotification(null), 3000)
        setBuyingId(null)
      },
    })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black text-text">Boutique du Jour</h1>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-text-light">
            <span>Nouveau tirage dans</span>
            <span className="font-bold tabular-nums text-accent">{timeLeft}</span>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {notification}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-text-light">Aucune carte disponible.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {items.map((item) => (
              <DailyShopCard
                key={item.id}
                item={item}
                dust={dust}
                buying={buyingId === item.id && buying}
                onBuy={() => handleBuy(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DailyShopCard({
  item,
  dust,
  buying,
  onBuy,
}: {
  item: DailyShopItem
  dust: number
  buying: boolean
  onBuy: () => void
}) {
  const canAfford = dust >= item.dustPrice

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`w-full transition-opacity ${item.purchased ? 'opacity-40' : ''}`}>
        <CardDisplay
          rarity={item.card.rarity}
          name={item.card.name}
          setName={item.card.set.name}
          imageUrl={item.card.imageUrl}
          variant={null}
          isOwned
          interactive={!item.purchased}
        />
      </div>
      {item.purchased ? (
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-green-500/10 px-3 py-2 text-sm font-bold text-green-400"
        >
          Achetée
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={buying || !canAfford}
          className={`w-full rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            canAfford
              ? 'bg-primary text-white hover:bg-primary/80'
              : 'cursor-not-allowed bg-muted text-text-light'
          }`}
        >
          {buying ? (
            '…'
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {item.dustPrice.toLocaleString('fr-FR')}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
