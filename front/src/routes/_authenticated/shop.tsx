import { createFileRoute } from '@tanstack/react-router'
import { Package, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

import { TcgCardFace } from '../../components/shared/tcg-card/TcgCardFace'
import { Button } from '../../components/ui/button'
import type { DailyShopItem } from '../../constants/daily-shop.constant'
import { useBuyDailyShopItem, useDailyShop } from '../../queries/useDailyShop'
import type { ShopItem } from '../../queries/useShop'
import { useBuyItem, useShopItems } from '../../queries/useShop'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/shop')({
  component: ShopPage,
})

// ── Countdown hook ──────────────────────────────────────────────────────────

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

// ── Shop item type config ───────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  TOKEN_PACK: {
    label: 'Packs de tokens',
    icon: <Zap className="h-5 w-5 text-primary" />,
    color: 'border-primary/30 bg-primary/5',
  },
  BOOST: {
    label: 'Boosts',
    icon: <Sparkles className="h-5 w-5 text-secondary" />,
    color: 'border-secondary/30 bg-secondary/5',
  },
  COSMETIC: {
    label: 'Cosmétiques',
    icon: <Package className="h-5 w-5 text-accent" />,
    color: 'border-accent/30 bg-accent/5',
  },
}

// ── Main page ───────────────────────────────────────────────────────────────

function ShopPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [notification, setNotification] = useState<string | null>(null)

  // Static shop
  const { data: shopData, isLoading: shopLoading } = useShopItems()
  const { mutate: buyShop, isPending: buyingShop } = useBuyItem()
  const [buyingShopId, setBuyingShopId] = useState<string | null>(null)

  // Daily shop
  const { data: dailyData, isLoading: dailyLoading } = useDailyShop()
  const { mutate: buyDaily, isPending: buyingDaily } = useBuyDailyShopItem()
  const [buyingDailyId, setBuyingDailyId] = useState<string | null>(null)
  const timeLeft = useCountdown()

  const dust = user?.dust ?? 0
  const shopItems = shopData?.items ?? []
  const dailyItems = dailyData?.items ?? []

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const handleBuyShop = (item: ShopItem) => {
    setBuyingShopId(item.id)
    buyShop(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustTotal })
        }
        notify(`✓ ${item.name} acheté ! −${result.dustSpent} ✨ dust`)
        setBuyingShopId(null)
      },
      onError: (err) => {
        notify(`✗ ${err.message}`)
        setBuyingShopId(null)
      },
    })
  }

  const handleBuyDaily = (item: DailyShopItem) => {
    setBuyingDailyId(item.id)
    buyDaily(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustBalance })
        }
        notify(`✓ ${result.card.name} obtenue ! −${result.dustSpent} poussière`)
        setBuyingDailyId(null)
      },
      onError: (err) => {
        notify(`✗ ${err.message}`)
        setBuyingDailyId(null)
      },
    })
  }

  const grouped = Object.entries(TYPE_CONFIG).map(([type, config]) => ({
    type,
    config,
    items: shopItems.filter((i) => i.type === type),
  }))

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-text">Boutique</h1>
          <p className="text-sm text-text-light">Dépense ta poussière</p>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {notification}
          </div>
        )}

        {/* ── Daily Shop Section ─────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Boutique du Jour</h2>
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-light">
              <span>Nouveau tirage dans</span>
              <span className="font-bold tabular-nums text-accent">{timeLeft}</span>
            </div>
          </div>

          {dailyLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : dailyItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-text-light">Aucune carte disponible.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {dailyItems.map((item) => (
                <DailyShopCard
                  key={item.id}
                  item={item}
                  dust={dust}
                  buying={buyingDailyId === item.id && buyingDaily}
                  onBuy={() => handleBuyDaily(item)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Static Shop Section ────────────────────────────────── */}
        {shopLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : shopItems.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-text-light">
              Aucun article disponible pour l'instant.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped
              .filter((g) => g.items.length > 0)
              .map(({ type, config, items: typeItems }) => (
                <section key={type}>
                  <div className="mb-3 flex items-center gap-2">
                    {config.icon}
                    <h2 className="text-sm font-bold text-text">
                      {config.label}
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {typeItems.map((item) => (
                      <StaticShopCard
                        key={item.id}
                        item={item}
                        dust={dust}
                        colorClass={config.color}
                        buying={buyingShopId === item.id && buyingShop}
                        onBuy={() => handleBuyShop(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Daily shop card ──────────────────────────────────────────────────────────

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
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-full aspect-3/4 ${item.purchased ? 'opacity-40' : ''}`}
        style={{ borderRadius: 10 }}
      >
        <TcgCardFace
          rarity={item.card.rarity}
          name={item.card.name}
          setName={item.card.set.name}
          imageUrl={item.card.imageUrl}
          variant={null}
          isOwned
          compact
        />
      </div>
      {item.purchased ? (
        <Button variant="ghost" size="sm" disabled className="w-full text-green-400">
          Achetée
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={buying || !canAfford}
          onClick={onBuy}
          variant={canAfford ? 'default' : 'secondary'}
          className="w-full"
        >
          {buying ? (
            '…'
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {item.dustPrice.toLocaleString('fr-FR')}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

// ── Static shop card ────────────────────────────────────────────────────────

function StaticShopCard({
  item,
  dust,
  colorClass,
  buying,
  onBuy,
}: {
  item: ShopItem
  dust: number
  colorClass: string
  buying: boolean
  onBuy: () => void
}) {
  const canAfford = dust >= item.dustCost

  return (
    <div className={`rounded-xl border p-4 ${colorClass} flex flex-col gap-3`}>
      <div>
        <h3 className="font-bold text-text">{item.name}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-text-light">
          {item.description}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm font-bold text-secondary">
          <Sparkles className="h-3.5 w-3.5" />
          {item.dustCost.toLocaleString('fr-FR')}
        </span>
        <Button
          size="sm"
          disabled={buying || !canAfford}
          onClick={onBuy}
          variant={canAfford ? 'default' : 'secondary'}
        >
          {buying ? '…' : canAfford ? 'Acheter' : 'Insuffisant'}
        </Button>
      </div>
    </div>
  )
}
