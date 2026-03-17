import { createFileRoute } from '@tanstack/react-router'
import { Package, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'

import type { ShopItem } from '../../queries/useShop'
import { useBuyItem, useShopItems } from '../../queries/useShop'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/shop')({
  component: ShopPage,
})

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

function ShopPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { data, isLoading } = useShopItems()
  const { mutate: buy, isPending: buying } = useBuyItem()
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const items = data?.items ?? []
  const dust = user?.dust ?? 0

  const handleBuy = (item: ShopItem) => {
    setBuyingId(item.id)
    buy(item.id, {
      onSuccess: (result) => {
        if (user) {
          setUser({ ...user, dust: result.newDustTotal })
        }
        setNotification(`✓ ${item.name} acheté ! −${result.dustSpent} ✨ dust`)
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

  const grouped = Object.entries(TYPE_CONFIG).map(([type, config]) => ({
    type,
    config,
    items: items.filter((i) => i.type === type),
  }))

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Boutique</h1>
            <p className="text-sm text-text-light">Dépense ta poussière</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-4 py-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-bold text-secondary">
              {dust.toLocaleString('fr-FR')} dust
            </span>
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
                      <ShopCard
                        key={item.id}
                        item={item}
                        dust={dust}
                        colorClass={config.color}
                        buying={buyingId === item.id && buying}
                        onBuy={() => handleBuy(item)}
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

function ShopCard({
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
        <button
          type="button"
          onClick={onBuy}
          disabled={buying || !canAfford}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            canAfford
              ? 'bg-primary text-white hover:bg-primary/80'
              : 'cursor-not-allowed bg-muted text-text-light'
          }`}
        >
          {buying ? '…' : canAfford ? 'Acheter' : 'Insuffisant'}
        </button>
      </div>
    </div>
  )
}
