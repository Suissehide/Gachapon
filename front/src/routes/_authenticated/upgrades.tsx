import { createFileRoute } from '@tanstack/react-router'
import { Sparkles, Ticket, TrendingUp, Zap } from 'lucide-react'
import { useBuyUpgrade, useUpgrades, type UpgradeStatus } from '../../queries/useUpgrades'
import { useAuthStore } from '../../stores/auth.store'
import type { UpgradeType } from '../../api/upgrades.api'

export const Route = createFileRoute('/_authenticated/upgrades')({
  component: UpgradesPage,
})

const UPGRADE_META: Record<UpgradeType, { icon: React.ReactNode; label: string; description: string; formatEffect: (v: number) => string }> = {
  REGEN: {
    icon: <Zap className="h-5 w-5" />,
    label: 'Accélération',
    description: "Réduit l'intervalle de régénération des tokens",
    formatEffect: (v) => `−${v} min`,
  },
  LUCK: {
    icon: <Sparkles className="h-5 w-5" />,
    label: 'Chance',
    description: 'Boost multiplicatif des taux de drop RARE+',
    formatEffect: (v) => `×${v.toFixed(2)}`,
  },
  DUST_HARVEST: {
    icon: <TrendingUp className="h-5 w-5" />,
    label: 'Récolteur',
    description: 'Multiplie la poussière gagnée par doublon',
    formatEffect: (v) => `×${v.toFixed(2)}`,
  },
  TOKEN_VAULT: {
    icon: <Ticket className="h-5 w-5" />,
    label: 'Réserve',
    description: 'Augmente le stock maximum de tokens',
    formatEffect: (v) => `+${v} tokens`,
  },
}

const MAX_LEVEL = 4

function UpgradesPage() {
  const { data, isLoading } = useUpgrades()
  const { mutate: buy, isPending, variables: buyingType } = useBuyUpgrade()
  const dust = useAuthStore((s) => s.user?.dust ?? 0)

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-text">Améliorations permanentes</h1>
          <p className="text-sm text-text-light">
            Dépensez votre poussière pour améliorer vos statistiques définitivement.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((upgrade) => (
            <UpgradeCard
              key={upgrade.type}
              upgrade={upgrade}
              dust={dust}
              buying={isPending && buyingType === upgrade.type}
              onBuy={() => buy(upgrade.type)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function UpgradeCard({
  upgrade,
  dust,
  buying,
  onBuy,
}: {
  upgrade: UpgradeStatus
  dust: number
  buying: boolean
  onBuy: () => void
}) {
  const meta = UPGRADE_META[upgrade.type]

  return (
    <div className={`rounded-xl border bg-card p-5 ${upgrade.isMaxed ? 'border-warning/40 bg-warning/5' : 'border-border'}`}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${upgrade.isMaxed ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
          {meta.icon}
        </div>
        <div>
          <p className="font-bold text-text">{meta.label}</p>
          <p className="text-xs text-text-light">{meta.description}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 flex gap-1.5">
        {Array.from({ length: MAX_LEVEL }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < upgrade.currentLevel
                ? upgrade.isMaxed ? 'bg-warning' : 'bg-primary'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="mb-4 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Niveau actuel</span>
          <span className="font-semibold text-text">
            {upgrade.currentLevel === 0
              ? 'Aucun'
              : `${['I','II','III','IV'][upgrade.currentLevel - 1]} — ${meta.formatEffect(upgrade.currentEffect!)}`}
          </span>
        </div>
        {!upgrade.isMaxed && upgrade.nextEffect !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light">Prochain niveau</span>
            <span className="font-semibold text-primary">
              {['I','II','III','IV'][upgrade.nextLevel! - 1]} — {meta.formatEffect(upgrade.nextEffect)}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      {upgrade.isMaxed ? (
        <div className="rounded-lg bg-warning/10 px-4 py-2 text-center text-xs font-bold text-warning">
          Niveau maximum atteint ★
        </div>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={buying || !upgrade.canAfford}
          className={`w-full rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            upgrade.canAfford
              ? 'bg-primary text-white hover:bg-primary/80'
              : 'cursor-not-allowed bg-muted text-text-light'
          }`}
        >
          {buying
            ? '…'
            : upgrade.canAfford
            ? `Améliorer · ${upgrade.nextCost!.toLocaleString('fr-FR')} dust`
            : `Fonds insuffisants · ${upgrade.nextCost!.toLocaleString('fr-FR')} dust`}
        </button>
      )}
    </div>
  )
}
