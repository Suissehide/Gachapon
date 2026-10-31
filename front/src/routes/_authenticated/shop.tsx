import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CalendarClock,
  Check,
  Clock,
  Cog,
  Lock,
  Package,
  Sparkles,
  Star,
  Ticket,
  Zap,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'

import { ELEMENT_CAPSULE_KINDS } from '../../components/machine/capsule/capsuleConfig'
import { CapsuleSwatch } from '../../components/shared/CapsuleSwatch'
import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button'
import { Card, CardTitle } from '../../components/ui/card'
import { PriceButton } from '../../components/ui/priceButton.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { DailyShopItem } from '../../constants/daily-shop.constant'
import { TOAST_SEVERITY } from '../../constants/ui.constant'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../libs/utils.ts'
import { useBuyDailyShopItem, useDailyShop } from '../../queries/useDailyShop'
import { useCometCapsule } from '../../queries/useGacha'
import type { ShopItem } from '../../queries/useShop'
import {
  useBuyItem,
  useOwnedMachines,
  useShopItems,
} from '../../queries/useShop'
import { usePurchaseWishlist, useWishlist } from '../../queries/useWishlist'
import { useAuthStore } from '../../stores/auth.store'

const TABS = ['tokens', 'cards', 'energy'] as const
type ShopTab = (typeof TABS)[number]

export const Route = createFileRoute('/_authenticated/shop')({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: ShopPage,
})

// Minimum visible spinner before showing "Acheté", and success display duration.
const MIN_SPIN_MS = 500
const SUCCESS_MS = 1500

// ── Countdowns ──────────────────────────────────────────────────────────────

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const diff = 3_600_000 - (now.getTime() % 3_600_000)
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

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function timeLeftParts(endsAt: string, now: number) {
  const diff = Math.max(0, Date.parse(endsAt) - now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    d: Math.floor(diff / 86_400_000),
    h: pad(Math.floor((diff % 86_400_000) / 3_600_000)),
    m: pad(Math.floor((diff % 3_600_000) / 60_000)),
  }
}

// ── Offres de jetons ─────────────────────────────────────────────────────────

const capsuleTypeOfItem = (item: ShopItem) =>
  item.type === 'CAPSULE'
    ? (item.value as { capsuleType?: string } | null)?.capsuleType
    : undefined

// Nombre de jetons d'un article : capsules d'un lot, ou jetons d'un pack.
function tokenQuantity(item: ShopItem): number {
  const value = item.value as { quantity?: number; tokens?: number } | null
  return value?.quantity ?? value?.tokens ?? 1
}

// Remise d'un lot par rapport au prix unitaire du plus petit lot de l'offre
// (en points de pourcentage, 0 si aucune).
function discountPct(item: ShopItem, offer: ShopItem[]): number {
  const unit = (i: ShopItem) => i.cost / tokenQuantity(i)
  const base = Math.max(...offer.map(unit))
  return Math.round((1 - unit(item) / base) * 100)
}

// ── Shop page ───────────────────────────────────────────────────────────────

type BuyState = {
  dust: number
  gold: number
  buyingId: string | null
  boughtId: string | null
  onBuy: (item: ShopItem) => void
}

function ShopPage() {
  const { t } = useTranslation(['shop', 'wishlist'])
  const { tab = 'tokens' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()

  const { data: shopData, isLoading: shopLoading } = useShopItems()
  const { mutate: buyShop } = useBuyItem()
  const [buyingShopId, setBuyingShopId] = useState<string | null>(null)
  const [justBoughtShopId, setJustBoughtShopId] = useState<string | null>(null)

  const dust = user?.dust ?? 0
  const gold = user?.gold ?? 0
  const shopItems = shopData?.items ?? []
  const energyDaily = shopData?.energyDaily
  const energyCapReached =
    energyDaily != null && energyDaily.used >= energyDaily.cap

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
        const currencyLabel =
          result.currency === 'GOLD'
            ? t('shop:toasts.currencyGold')
            : t('shop:toasts.currencyDust')
        toast({
          title: item.name,
          message: t('shop:toasts.boughtMessage', {
            amount: result.amountSpent,
            currency: currencyLabel,
          }),
          severity: TOAST_SEVERITY.SUCCESS,
        })
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

  const buy: BuyState = {
    dust,
    gold,
    buyingId: buyingShopId,
    boughtId: justBoughtShopId,
    onBuy: handleBuyShop,
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: t('shop:breadcrumb') },
        ]}
        title={t('shop:title')}
      />

      <SegmentedControl<ShopTab>
        className="w-fit"
        optionClassName="h-10 px-4 text-sm [&_svg]:h-4 [&_svg]:w-4"
        options={[
          {
            value: 'tokens',
            label: t('shop:tabs.tokens'),
            icon: <Ticket />,
          },
          { value: 'cards', label: t('shop:tabs.cards'), icon: <Star /> },
          { value: 'energy', label: t('shop:tabs.energy'), icon: <Zap /> },
        ]}
        value={tab}
        onChange={(next) => navigate({ search: { tab: next }, replace: true })}
      />

      {tab === 'cards' ? (
        <>
          <WishlistSection dust={dust} />
          <DailyShopSection dust={dust} />
          <OtherItemsSection items={shopItems} types={['COSMETIC']} buy={buy} />
        </>
      ) : shopLoading ? (
        <Card className="flex h-48 items-center justify-center p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </Card>
      ) : tab === 'energy' ? (
        <EnergySection
          items={shopItems.filter((i) => i.type === 'ENERGY_PACK')}
          buy={buy}
          capReached={energyCapReached}
        />
      ) : (
        <TokensTab items={shopItems} buy={buy} />
      )}
    </PageShell>
  )
}

// ── Briques communes ─────────────────────────────────────────────────────────

function ShopSection({
  icon,
  title,
  aside,
  children,
}: {
  icon: ReactNode
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2 self-center">
          {icon}
          <CardTitle className="text-sm uppercase tracking-wider">
            {title}
          </CardTitle>
        </div>
        {aside && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-light">
            {aside}
          </span>
        )}
      </div>
      {children}
    </Card>
  )
}

function ItemCountAside({ count }: { count: number }) {
  const { t } = useTranslation('shop')
  return <>{t('shop:sections.itemCount', { count })}</>
}

// Bloc d'offre : la teinte de son type de jeton, contenu libre.
function OfferBlock({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border p-4', className)}>
      {children}
    </div>
  )
}

// Ligne d'achat : quantité (+ remise) à gauche, bouton de prix à droite.
function BuyRow({
  item,
  offer,
  buy,
}: {
  item: ShopItem
  offer: ShopItem[]
  buy: BuyState
}) {
  const { t } = useTranslation('shop')
  const pct = discountPct(item, offer)
  const funds = item.currency === 'GOLD' ? buy.gold : buy.dust
  return (
    <div className="flex items-center justify-between gap-2.5 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3">
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-text">
        {t('shop:offer.tokenCount', { count: tokenQuantity(item) })}
        {pct > 0 && (
          <Badge variant="success" size="sm">
            {t('shop:offer.discount', { pct })}
          </Badge>
        )}
      </span>
      <PriceButton
        currency={item.currency}
        amount={item.cost}
        buying={buy.buyingId === item.id}
        bought={buy.boughtId === item.id}
        disabled={funds < item.cost}
        onClick={() => buy.onBuy(item)}
      />
    </div>
  )
}

function BuyRows({ offer, buy }: { offer: ShopItem[]; buy: BuyState }) {
  return (
    <div className="flex flex-col gap-2">
      {offer.map((item) => (
        <BuyRow key={item.id} item={item} offer={offer} buy={buy} />
      ))}
    </div>
  )
}

// Titre + texte à gauche, lignes d'achat à droite (astral, classiques).
function SplitOffer({
  className,
  title,
  text,
  offer,
  buy,
}: {
  className: string
  title: string
  text: ReactNode
  offer: ShopItem[]
  buy: BuyState
}) {
  return (
    <OfferBlock
      className={cn(
        'md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5',
        className,
      )}
    >
      <div>
        <h3 className="font-display text-xl font-extrabold text-text">
          {title}
        </h3>
        <p className="mt-0.5 max-w-[62ch] text-[13px] leading-relaxed text-text-light">
          {text}
        </p>
      </div>
      <div className="md:min-w-[230px]">
        <BuyRows offer={offer} buy={buy} />
      </div>
    </OfferBlock>
  )
}

// ── Onglet Jetons ────────────────────────────────────────────────────────────

const byCost = (a: ShopItem, b: ShopItem) => a.cost - b.cost

function TokensTab({ items, buy }: { items: ShopItem[]; buy: BuyState }) {
  const { t } = useTranslation(['shop', 'gacha'])
  const ofCapsule = (type: string) =>
    items.filter((i) => capsuleTypeOfItem(i) === type).sort(byCost)
  const comet = ofCapsule('COMET')
  const astral = ofCapsule('ASTRAL')
  const elements = ELEMENT_CAPSULE_KINDS.map((kind) => ({
    kind,
    offer: ofCapsule(kind.toUpperCase()),
  })).filter((e) => e.offer.length > 0)
  const classic = items.filter((i) => i.type === 'TOKEN_PACK').sort(byCost)

  return (
    <>
      {classic.length > 0 && (
        <ShopSection
          icon={<CapsuleSwatch kind="classic" />}
          title={t('shop:typeLabels.TOKEN_PACK')}
          aside={<ItemCountAside count={classic.length} />}
        >
          <SplitOffer
            className="border-primary/30 bg-primary/5"
            title={t('shop:classic.title')}
            text={t('shop:classic.text')}
            offer={classic}
            buy={buy}
          />
        </ShopSection>
      )}

      {comet.length > 0 && <CometSection offer={comet} buy={buy} />}

      {astral.length > 0 && (
        <ShopSection
          icon={<CapsuleSwatch kind="astral" />}
          title={t('shop:typeLabels.CAPSULE_ASTRAL')}
          aside={<ItemCountAside count={astral.length} />}
        >
          <SplitOffer
            className="border-violet-500/30 bg-linear-[110deg] from-yellow-500/6 to-violet-500/6"
            title={t('shop:astral.title')}
            text={
              <Trans
                t={t}
                i18nKey="shop:astral.text"
                components={{
                  light: <b className="text-astral-light-ink" />,
                  dark: <b className="text-astral-dark-ink" />,
                }}
              />
            }
            offer={astral}
            buy={buy}
          />
        </ShopSection>
      )}

      {elements.length > 0 && (
        <ShopSection
          icon={<CapsuleSwatch kind="elemental" />}
          title={t('shop:typeLabels.CAPSULE_ELEMENT')}
          aside={
            <ItemCountAside
              count={elements.reduce((n, e) => n + e.offer.length, 0)}
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {elements.map(({ kind, offer }) => (
              <OfferBlock key={kind} className="border-border bg-muted">
                <h3 className="flex items-center gap-2 font-bold text-text">
                  <CapsuleSwatch kind={kind} className="h-[22px] w-[22px]" />
                  {t(`gacha:page.capsuleNames.${kind}`)}
                </h3>
                <div className="mt-auto">
                  <BuyRows offer={offer} buy={buy} />
                </div>
              </OfferBlock>
            ))}
          </div>
        </ShopSection>
      )}

      <OtherItemsSection items={items} types={['BOOST', 'MACHINE']} buy={buy} />
    </>
  )
}

// ── Jeton Constellation ────────────────────────────────────────────────────────

type Week = 'current' | 'next'

function CometSection({ offer, buy }: { offer: ShopItem[]; buy: BuyState }) {
  const { t } = useTranslation('shop')
  const { data, refetch } = useCometCapsule()
  const now = useNow(60_000)
  const [week, setWeek] = useState<Week>('current')

  useEffect(() => {
    if (data && Date.parse(data.current.endsAt) <= now) {
      void refetch()
    }
  }, [data, now, refetch])

  const left = data ? timeLeftParts(data.current.endsAt, now) : null
  const cards = data ? data[week].cards : []

  return (
    <ShopSection
      icon={<CapsuleSwatch kind="comet" />}
      title={t('shop:typeLabels.CAPSULE_COMET')}
      aside={
        left && (
          <>
            {t('shop:sections.cometRefreshIn')}{' '}
            <b className="tabular-nums text-accent">
              {left.d > 0
                ? t('shop:sections.timeLeftDays', left)
                : t('shop:sections.timeLeftHours', left)}
            </b>
          </>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <OfferBlock className="border-teal-500/35 bg-teal-500/5">
          <div>
            <h3 className="font-display text-xl font-extrabold text-text">
              {t('shop:comet.title')}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-light">
              <Trans
                t={t}
                i18nKey="shop:comet.text"
                components={{ b: <b className="text-text" /> }}
              />
            </p>
          </div>
          <div className="mt-auto">
            <BuyRows offer={offer} buy={buy} />
          </div>
        </OfferBlock>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl<Week>
              options={[
                { value: 'current', label: t('shop:comet.thisWeek') },
                { value: 'next', label: t('shop:comet.nextWeek') },
              ]}
              value={week}
              onChange={setWeek}
            />
            <span className="text-[12.5px] text-text-light">
              {week === 'current'
                ? t('shop:comet.cardCount', { count: cards.length })
                : t('shop:comet.nextMeta', { count: cards.length })}
            </span>
          </div>
          <div
            className={cn(
              'grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5',
              week === 'next' && 'opacity-85',
            )}
          >
            {cards.map((card) => (
              <CardDisplay
                key={card.id}
                rarity={card.rarity}
                name={card.name}
                setName={card.set.name}
                imageUrl={card.imageUrl}
                variant={null}
                element={card.element}
                isOwned
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </ShopSection>
  )
}

// ── Énergie ──────────────────────────────────────────────────────────────────

function EnergySection({
  items,
  buy,
  capReached,
}: {
  items: ShopItem[]
  buy: BuyState
  capReached: boolean
}) {
  const { t } = useTranslation('shop')
  return (
    <ShopSection
      icon={<Zap className="h-4 w-4 text-accent" />}
      title={t('shop:typeLabels.ENERGY_PACK')}
      aside={<ItemCountAside count={items.length} />}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {[...items].sort(byCost).map((item) => (
          <StaticShopCard
            key={item.id}
            item={item}
            colorClass="border-violet-500/30 bg-violet-500/5"
            buy={buy}
            capReached={capReached}
          />
        ))}
      </div>
    </ShopSection>
  )
}

// ── Autres articles : boosts et machines (Jetons), cosmétiques (Cartes) ─────

type OtherType = 'BOOST' | 'MACHINE' | 'COSMETIC'

const OTHER_ICONS: Record<OtherType, ReactNode> = {
  BOOST: <Sparkles className="h-4 w-4 text-secondary" />,
  MACHINE: <Cog className="h-4 w-4 text-primary" />,
  COSMETIC: <Package className="h-4 w-4 text-accent" />,
}

function OtherItemsSection({
  items,
  types,
  buy,
}: {
  items: ShopItem[]
  types: OtherType[]
  buy: BuyState
}) {
  const { t } = useTranslation('shop')
  const { data: machinesData } = useOwnedMachines()
  const ownedMachineIds = machinesData?.machineIds ?? []
  return (
    <>
      {types.map((type) => {
        const typeItems = items.filter((i) => i.type === type).sort(byCost)
        if (typeItems.length === 0) {
          return null
        }
        return (
          <ShopSection
            key={type}
            icon={OTHER_ICONS[type]}
            title={t(`shop:typeLabels.${type}`)}
            aside={<ItemCountAside count={typeItems.length} />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {typeItems.map((item) => {
                const machineId = (item.value as { machineId?: string } | null)
                  ?.machineId
                return (
                  <StaticShopCard
                    key={item.id}
                    item={item}
                    colorClass="border-primary/30 bg-primary/5"
                    buy={buy}
                    owned={
                      machineId ? ownedMachineIds.includes(machineId) : false
                    }
                  />
                )
              })}
            </div>
          </ShopSection>
        )
      })}
    </>
  )
}

// ── Onglet Cartes : Marché ───────────────────────────────────────────────────

function DailyShopSection({ dust }: { dust: number }) {
  const { t } = useTranslation(['shop', 'wishlist'])
  const { setUser } = useAuthStore.getState()
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const { data: dailyData, isLoading: dailyLoading } = useDailyShop()
  const { mutate: buyDaily } = useBuyDailyShopItem()
  const [buyingDailyId, setBuyingDailyId] = useState<string | null>(null)
  const timeLeft = useCountdown()
  const dailyItems = dailyData?.items ?? []

  const handleBuyDaily = (item: DailyShopItem) => {
    setBuyingDailyId(item.id)
    const clickedAt = Date.now()
    buyDaily(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustBalance })
        }
        toast({
          title: result.card.name,
          message: t('wishlist:toasts.purchasedMessage', {
            dust: result.dustSpent,
          }),
          severity: TOAST_SEVERITY.SUCCESS,
        })
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

  return (
    <ShopSection
      icon={<CalendarClock className="h-4 w-4 text-accent" />}
      title={t('shop:sections.dailyShopTitle')}
      aside={
        <>
          {t('shop:sections.nextRefreshIn')}{' '}
          <b className="tabular-nums text-accent">{timeLeft}</b>
        </>
      }
    >
      {dailyLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : dailyItems.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="font-mono text-xs uppercase tracking-wider text-text-light">
            {t('shop:sections.noCardAvailable')}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {dailyItems.map((item) => (
            <div key={item.id} className="w-[120px] sm:w-[130px] md:w-[140px]">
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
    </ShopSection>
  )
}

// ── Onglet Cartes : Vœux ─────────────────────────────────────────────────────

function WishlistSection({ dust }: { dust: number }) {
  const { t } = useTranslation('shop')
  const { data: wishlist, isLoading } = useWishlist()
  const { mutate: purchase, isPending: purchasing } = usePurchaseWishlist()
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const cards = wishlist?.cards ?? []
  const slots = wishlist?.slots ?? 0

  return (
    <ShopSection
      icon={<Star className="h-4 w-4 text-primary" />}
      title={t('shop:sections.wishlistTitle')}
      aside={!isLoading && slots > 0 && `${cards.length} / ${slots}`}
    >
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
                <PriceButton
                  currency="DUST"
                  amount={card.price}
                  buying={purchasing && buyingId === card.id}
                  disabled={dust < card.price}
                  onClick={() => {
                    setBuyingId(card.id)
                    purchase(card.id)
                  }}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-text-light">
            {t('shop:wishlistSection.emptyPrefix')}{' '}
            <Link
              to="/collection"
              className="text-primary underline underline-offset-2"
            >
              {t('shop:wishlistSection.emptyLink')}
            </Link>
          </p>
        </div>
      )}
    </ShopSection>
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
  const { t } = useTranslation('shop')

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={cn('w-full', item.purchased && 'opacity-40')}>
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
      {item.purchased ? (
        <Button
          variant="secondary"
          size="price"
          disabled
          className="w-full gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          {t('shop:dailyCard.bought')}
        </Button>
      ) : (
        <PriceButton
          currency="DUST"
          amount={item.dustPrice}
          buying={buying}
          disabled={dust < item.dustPrice}
          onClick={onBuy}
          className="w-full"
        />
      )}
    </div>
  )
}

// ── Static shop card ────────────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set([
  'TOKEN_PACK',
  'ENERGY_PACK',
  'MACHINE',
  'BOOST',
  'CAPSULE',
])

function StaticShopCardAction({
  item,
  buy,
  owned,
  capReached,
}: {
  item: ShopItem
  buy: BuyState
  owned?: boolean
  capReached?: boolean
}) {
  const { t } = useTranslation('shop')
  if (owned) {
    return (
      <Button size="price" variant="secondary" disabled className="gap-1.5">
        <Check className="h-3.5 w-3.5" />
        {t('shop:staticCard.owned')}
      </Button>
    )
  }
  if (!SUPPORTED_TYPES.has(item.type)) {
    return (
      <Button size="price" variant="secondary" disabled className="gap-1.5">
        <Lock className="h-3.5 w-3.5" />
        {t('shop:staticCard.comingSoon')}
      </Button>
    )
  }
  if (capReached && buy.boughtId !== item.id) {
    return (
      <Button size="price" variant="secondary" disabled className="gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {t('shop:apiTitles.dailyLimitTitle')}
      </Button>
    )
  }
  const funds = item.currency === 'GOLD' ? buy.gold : buy.dust
  return (
    <PriceButton
      currency={item.currency}
      amount={item.cost}
      buying={buy.buyingId === item.id}
      bought={buy.boughtId === item.id}
      disabled={funds < item.cost}
      onClick={() => buy.onBuy(item)}
    />
  )
}

function StaticShopCard({
  item,
  colorClass,
  buy,
  owned,
  capReached,
}: {
  item: ShopItem
  colorClass: string
  buy: BuyState
  owned?: boolean
  capReached?: boolean
}) {
  const { t } = useTranslation('shop')
  const pulls = item.activeBoost?.pullsRemaining ?? 0
  const isBoostActive = item.type === 'BOOST' && pulls > 0

  return (
    <OfferBlock className={colorClass}>
      <div>
        <h3 className="font-bold text-text">{item.name}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-text-light">
          {item.description}
        </p>
        {isBoostActive && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-secondary/15 px-2 py-1 text-xs font-semibold text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            {t('shop:staticCard.activeBoost', { count: pulls })}
          </div>
        )}
      </div>
      <div className="mt-auto flex justify-end">
        <StaticShopCardAction
          item={item}
          buy={buy}
          owned={owned}
          capReached={capReached}
        />
      </div>
    </OfferBlock>
  )
}
