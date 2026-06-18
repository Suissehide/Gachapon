import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarClock,
  Check,
  Cog,
  Lock,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay'
import { Button } from '../../components/ui/button'
import { Card, CardTitle } from '../../components/ui/card'
import type { DailyShopItem } from '../../constants/daily-shop.constant'
import { TOAST_SEVERITY } from '../../constants/ui.constant'
import { useToast } from '../../hooks/useToast'
import { useBuyDailyShopItem, useDailyShop } from '../../queries/useDailyShop'
import type { ShopItem } from '../../queries/useShop'
import { useBuyItem, useOwnedMachines, useShopItems } from '../../queries/useShop'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/shop')({
  component: ShopPage,
})

// Minimum visible spinner before showing "Achat réussi", and success display duration.
const MIN_SPIN_MS = 500
const SUCCESS_MS = 1500

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
    icon: <Zap className="h-4 w-4 text-primary" />,
    color: 'border-primary/30 bg-primary/5',
  },
  BOOST: {
    label: 'Boosts',
    icon: <Sparkles className="h-4 w-4 text-secondary" />,
    color: 'border-secondary/30 bg-secondary/5',
  },
  COSMETIC: {
    label: 'Cosmétiques',
    icon: <Package className="h-4 w-4 text-accent" />,
    color: 'border-accent/30 bg-accent/5',
  },
  MACHINE: {
    label: 'Machines',
    icon: <Cog className="h-4 w-4 text-primary" />,
    color: 'border-primary/30 bg-primary/5',
  },
}

// ── Main page ───────────────────────────────────────────────────────────────

function ShopPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()

  // Static shop
  const { data: shopData, isLoading: shopLoading } = useShopItems()
  const { mutate: buyShop } = useBuyItem()
  const [buyingShopId, setBuyingShopId] = useState<string | null>(null)
  const [justBoughtShopId, setJustBoughtShopId] = useState<string | null>(null)
  const { data: machinesData } = useOwnedMachines()
  const ownedMachineIds = machinesData?.machineIds ?? []

  // Daily shop
  const { data: dailyData, isLoading: dailyLoading } = useDailyShop()
  const { mutate: buyDaily } = useBuyDailyShopItem()
  const [buyingDailyId, setBuyingDailyId] = useState<string | null>(null)
  const timeLeft = useCountdown()

  const dust = user?.dust ?? 0
  const shopItems = shopData?.items ?? []
  const dailyItems = dailyData?.items ?? []

  const notifySuccess = (title: string, message: string) => {
    toast({ title, message, severity: TOAST_SEVERITY.SUCCESS })
  }

  const notifyError = (message: string) => {
    toast({ title: 'Erreur', message, severity: TOAST_SEVERITY.ERROR })
  }

  const handleBuyShop = (item: ShopItem) => {
    setBuyingShopId(item.id)
    const clickedAt = Date.now()
    buyShop(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustTotal, tokens: result.newTokenTotal })
        }
        notifySuccess(item.name, `Acheté ! −${result.dustSpent} poussière`)
        const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - clickedAt))
        setTimeout(() => {
          setBuyingShopId((id) => (id === item.id ? null : id))
          setJustBoughtShopId(item.id)
          setTimeout(() => {
            setJustBoughtShopId((id) => (id === item.id ? null : id))
          }, SUCCESS_MS)
        }, remaining)
      },
      onError: (err) => {
        notifyError(err.message)
        setBuyingShopId(null)
      },
    })
  }

  const handleBuyDaily = (item: DailyShopItem) => {
    setBuyingDailyId(item.id)
    const clickedAt = Date.now()
    buyDaily(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustBalance })
        }
        notifySuccess(result.card.name, `Obtenue ! −${result.dustSpent} poussière`)
        const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - clickedAt))
        setTimeout(() => {
          setBuyingDailyId((id) => (id === item.id ? null : id))
        }, remaining)
      },
      onError: (err) => {
        notifyError(err.message)
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
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {/* Header */}
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-text-light">
            Boutique
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text">
            Dépense ta poussière
          </h1>
        </div>

        {/* ── Daily Shop Section ─────────────────────────────────── */}
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm uppercase tracking-wider">
                Boutique du jour
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-text-light">
              <span>Nouveau tirage dans</span>
              <span className="font-bold tabular-nums text-accent">
                {timeLeft}
              </span>
            </div>
          </div>

          {dailyLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : dailyItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="font-mono text-xs uppercase tracking-wider text-text-light">
                Aucune carte disponible
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {dailyItems.map((item) => (
                <div
                  key={item.id}
                  className="w-[120px] sm:w-[130px] md:w-[140px]"
                >
                  <DailyShopCard
                    item={item}
                    dust={dust}
                    buying={buyingDailyId === item.id}
                    onBuy={() => handleBuyDaily(item)}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Static Shop Section ────────────────────────────────── */}
        {shopLoading ? (
          <Card className="flex h-48 items-center justify-center p-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </Card>
        ) : shopItems.length === 0 ? (
          <Card className="flex h-48 items-center justify-center p-6">
            <p className="font-mono text-xs uppercase tracking-wider text-text-light">
              Aucun article disponible pour l'instant
            </p>
          </Card>
        ) : (
          grouped
            .filter((g) => g.items.length > 0)
            .map(({ type, config, items: typeItems }) => (
              <Card key={type} className="p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <CardTitle className="text-sm uppercase tracking-wider">
                      {config.label}
                    </CardTitle>
                  </div>
                  <span className="font-mono text-[11px] text-text-light">
                    {typeItems.length} ARTICLE{typeItems.length > 1 ? 'S' : ''}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {typeItems.map((item) => {
                    const machineId =
                      item.type === 'MACHINE'
                        ? (item.value as { machineId?: string })?.machineId
                        : undefined
                    const owned = machineId
                      ? ownedMachineIds.includes(machineId)
                      : false
                    return (
                      <StaticShopCard
                        key={item.id}
                        item={item}
                        dust={dust}
                        colorClass={config.color}
                        buying={buyingShopId === item.id}
                        justBought={justBoughtShopId === item.id}
                        owned={owned}
                        onBuy={() => handleBuyShop(item)}
                      />
                    )
                  })}
                </div>
              </Card>
            ))
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
    <div className="flex flex-col items-center gap-2.5">
      <div className={`w-full ${item.purchased ? 'opacity-40' : ''}`}>
        <CardDisplay
          rarity={item.card.rarity}
          name={item.card.name}
          setName={item.card.set.name}
          imageUrl={item.card.imageUrl}
          variant={null}
          isOwned
          interactive={!item.purchased}
          compact
        />
      </div>
      {buying ? (
        <Button size="sm" disabled className="w-full">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </Button>
      ) : item.purchased ? (
        <Button
          variant="secondary"
          size="sm"
          disabled
          className="w-full gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          Achetée
        </Button>
      ) : !canAfford ? (
        <Button
          size="sm"
          disabled
          variant="outline"
          className="w-full gap-1 text-text-light/70"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {item.dustPrice.toLocaleString('fr-FR')}
          </span>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onBuy}
          variant="gradient"
          className="w-full gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {item.dustPrice.toLocaleString('fr-FR')}
          </span>
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
  justBought,
  owned,
  onBuy,
}: {
  item: ShopItem
  dust: number
  colorClass: string
  buying: boolean
  justBought: boolean
  owned?: boolean
  onBuy: () => void
}) {
  const canAfford = dust >= item.dustCost
  const supported = item.type === 'TOKEN_PACK' || item.type === 'MACHINE'

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
          <span className="tabular-nums">
            {item.dustCost.toLocaleString('fr-FR')}
          </span>
        </span>
        {justBought ? (
          <Button
            size="sm"
            disabled
            variant="gradient"
            className="gap-1.5 animate-[shop-success-pop_0.4s_var(--ease-spring)]"
          >
            <Check className="h-3.5 w-3.5" />
            Achat réussi
          </Button>
        ) : owned ? (
          <Button size="sm" variant="secondary" disabled className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Possédée
          </Button>
        ) : !supported ? (
          <Button size="sm" variant="secondary" disabled className="gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Bientôt
          </Button>
        ) : buying ? (
          <Button size="sm" disabled>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </Button>
        ) : !canAfford ? (
          <Button size="sm" disabled variant="outline" className="text-text-light/70">
            Insuffisant
          </Button>
        ) : (
          <Button size="sm" variant="gradient" onClick={onBuy}>
            Acheter
          </Button>
        )}
      </div>
    </div>
  )
}
