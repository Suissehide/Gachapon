import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CalendarClock,
  Check,
  Clock,
  Cog,
  Coins,
  Lock,
  Package,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay'
import { Button } from '../../components/ui/button'
import { Card, CardTitle } from '../../components/ui/card'
import type { DailyShopItem } from '../../constants/daily-shop.constant'
import { TOAST_SEVERITY } from '../../constants/ui.constant'
import { useToast } from '../../hooks/useToast'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { useBuyDailyShopItem, useDailyShop } from '../../queries/useDailyShop'
import type { ShopItem } from '../../queries/useShop'
import {
  useBuyItem,
  useOwnedMachines,
  useShopItems,
} from '../../queries/useShop'
import { usePurchaseWishlist, useWishlist } from '../../queries/useWishlist'
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
      const midnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      )
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setTimeLeft(
        `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return timeLeft
}

// ── Wishlist countdown hook ─────────────────────────────────────────────────

// ── Shop item type config ───────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  TOKEN_PACK: {
    label: 'Packs de jetons',
    icon: <Zap className="h-4 w-4 text-primary" />,
    color: 'border-primary/30 bg-primary/5',
  },
  ENERGY_PACK: {
    // Zap violet = identité visuelle de l'énergie sur la page campagne
    // (campaign.tsx utilise Zap text-violet-500 pour le coût en PC).
    label: 'Énergie',
    icon: <Zap className="h-4 w-4 text-violet-500" />,
    color: 'border-violet-500/30 bg-violet-500/5',
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
  const gold = user?.gold ?? 0
  const shopItems = shopData?.items ?? []
  const dailyItems = dailyData?.items ?? []
  const energyDaily = shopData?.energyDaily
  const energyCapReached =
    energyDaily != null && energyDaily.used >= energyDaily.cap

  const notifySuccess = (title: string, message: string) => {
    toast({ title, message, severity: TOAST_SEVERITY.SUCCESS })
  }

  const handleBuyShop = (item: ShopItem) => {
    setBuyingShopId(item.id)
    const clickedAt = Date.now()
    buyShop(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({
            ...user,
            dust: result.newDustTotal,
            gold: result.newGoldTotal,
            tokens: result.newTokenTotal,
          })
        }
        const currencyLabel = result.currency === 'GOLD' ? 'or' : 'poussière'
        notifySuccess(
          item.name,
          `Acheté ! −${result.amountSpent} ${currencyLabel}`,
        )
        const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - clickedAt))
        setTimeout(() => {
          setBuyingShopId((id) => (id === item.id ? null : id))
          setJustBoughtShopId(item.id)
          setTimeout(() => {
            setJustBoughtShopId((id) => (id === item.id ? null : id))
          }, SUCCESS_MS)
        }, remaining)
      },
      onError: () => {
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
        notifySuccess(
          result.card.name,
          `Obtenue ! −${result.dustSpent} poussière`,
        )
        const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - clickedAt))
        setTimeout(() => {
          setBuyingDailyId((id) => (id === item.id ? null : id))
        }, remaining)
      },
      onError: () => {
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
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Boutique' },
        ]}
        title="Dépense ta poussière"
      />

      {/* ── Wishlist Section ──────────────────────────────────── */}
      <WishlistSection dust={dust} />

      {/* ── Daily Shop Section ─────────────────────────────────── */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
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
                      gold={gold}
                      colorClass={config.color}
                      buying={buyingShopId === item.id}
                      justBought={justBoughtShopId === item.id}
                      owned={owned}
                      capReached={
                        energyCapReached && item.type === 'ENERGY_PACK'
                      }
                      onBuy={() => handleBuyShop(item)}
                    />
                  )
                })}
              </div>
            </Card>
          ))
      )}
    </PageShell>
  )
}

// ── Wishlist section ────────────────────────────────────────────────────────

function WishlistBuyButton({
  canAfford,
  purchasing,
  price,
  onBuy,
}: {
  canAfford: boolean
  purchasing: boolean
  price: number
  onBuy: () => void
}) {
  const priceLabel = formatNumber(price, currentLocale())

  if (purchasing) {
    return (
      <Button size="sm" disabled className="w-full">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    )
  }
  return (
    <Button
      size="sm"
      variant={canAfford ? 'gradient' : 'outline'}
      disabled={!canAfford}
      onClick={onBuy}
      className={`w-full gap-1${canAfford ? '' : ' text-text-light/70'}`}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="tabular-nums">{priceLabel}</span>
    </Button>
  )
}

function WishlistSection({ dust }: { dust: number }) {
  const { data: wishlist, isLoading } = useWishlist()
  const { mutate: purchase, isPending: purchasing } = usePurchaseWishlist()
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const cards = wishlist?.cards ?? []
  const slots = wishlist?.slots ?? 0

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm uppercase tracking-wider">Vœux</CardTitle>
        {!isLoading && slots > 0 && (
          <span className="ml-auto font-mono text-xs text-text-light">
            {cards.length} / {slots}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : cards.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          {cards.map((card) => (
            <div key={card.id} className="w-[120px] sm:w-[130px] md:w-[140px]">
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-full">
                  <CardDisplay
                    rarity={card.rarity}
                    name={card.name}
                    setName={card.set.name}
                    imageUrl={card.imageUrl}
                    variant={null}
                    element={card.element}
                    isOwned
                    interactive={dust >= card.price}
                    compact
                  />
                </div>
                <WishlistBuyButton
                  canAfford={dust >= card.price}
                  purchasing={purchasing && buyingId === card.id}
                  price={card.price}
                  onBuy={() => {
                    setBuyingId(card.id)
                    purchase(card.id)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-text-light">
            Choisis des cartes dans ta{' '}
            <Link
              to="/collection"
              className="text-primary underline underline-offset-2"
            >
              collection
            </Link>
          </p>
        </div>
      )}
    </Card>
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
  const locale = currentLocale()
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
          element={item.card.element}
          isOwned
          interactive={!item.purchased}
          newBadge={!item.owned && !item.purchased}
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
      ) : canAfford ? (
        <Button
          size="sm"
          onClick={onBuy}
          variant="gradient"
          className="w-full gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {formatNumber(item.dustPrice, locale)}
          </span>
        </Button>
      ) : (
        <Button
          size="sm"
          disabled
          variant="outline"
          className="w-full gap-1 text-text-light/70"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {formatNumber(item.dustPrice, locale)}
          </span>
        </Button>
      )}
    </div>
  )
}

// ── Static shop card ────────────────────────────────────────────────────────

function StaticShopCardAction({
  canAfford,
  supported,
  buying,
  justBought,
  owned,
  capReached,
  onBuy,
}: {
  canAfford: boolean
  supported: boolean
  buying: boolean
  justBought: boolean
  owned?: boolean
  capReached?: boolean
  onBuy: () => void
}) {
  if (justBought) {
    return (
      <Button
        size="sm"
        disabled
        variant="gradient"
        className="gap-1.5 animate-[shop-success-pop_0.4s_var(--ease-spring)]"
      >
        <Check className="h-3.5 w-3.5" />
        Achat réussi
      </Button>
    )
  }
  if (owned) {
    return (
      <Button size="sm" variant="secondary" disabled className="gap-1.5">
        <Check className="h-3.5 w-3.5" />
        Possédée
      </Button>
    )
  }
  if (!supported) {
    return (
      <Button size="sm" variant="secondary" disabled className="gap-1.5">
        <Lock className="h-3.5 w-3.5" />
        Bientôt
      </Button>
    )
  }
  if (buying) {
    return (
      <Button size="sm" disabled>
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    )
  }
  if (capReached) {
    return (
      <Button size="sm" variant="secondary" disabled className="gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Limite atteinte
      </Button>
    )
  }
  if (canAfford) {
    return (
      <Button size="sm" variant="gradient" onClick={onBuy}>
        Acheter
      </Button>
    )
  }
  return (
    <Button size="sm" disabled variant="outline" className="text-text-light/70">
      Insuffisant
    </Button>
  )
}

function StaticShopCard({
  item,
  dust,
  gold,
  colorClass,
  buying,
  justBought,
  owned,
  capReached,
  onBuy,
}: {
  item: ShopItem
  dust: number
  gold: number
  colorClass: string
  buying: boolean
  justBought: boolean
  owned?: boolean
  capReached?: boolean
  onBuy: () => void
}) {
  const locale = currentLocale()
  const isGold = item.currency === 'GOLD'
  const canAfford = (isGold ? gold : dust) >= item.cost
  const supported =
    item.type === 'TOKEN_PACK' ||
    item.type === 'ENERGY_PACK' ||
    item.type === 'MACHINE' ||
    item.type === 'BOOST'
  const pulls = item.activeBoost?.pullsRemaining ?? 0
  const isBoostActive = item.type === 'BOOST' && pulls > 0

  return (
    <div className={`rounded-xl border p-4 ${colorClass} flex flex-col gap-3`}>
      <div>
        <h3 className="font-bold text-text">{item.name}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-text-light">
          {item.description}
        </p>
        {isBoostActive && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-secondary/15 px-2 py-1 text-xs font-semibold text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            Actif — {pulls} tirage{pulls > 1 ? 's' : ''} restant
            {pulls > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span
          className={`flex items-center gap-1 text-sm font-bold ${
            isGold ? 'text-primary' : 'text-secondary'
          }`}
        >
          {isGold ? (
            <Coins className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="tabular-nums">
            {formatNumber(item.cost, locale)}
          </span>
        </span>
        <StaticShopCardAction
          canAfford={canAfford}
          supported={supported}
          buying={buying}
          justBought={justBought}
          owned={owned}
          capReached={capReached}
          onBuy={onBuy}
        />
      </div>
    </div>
  )
}
