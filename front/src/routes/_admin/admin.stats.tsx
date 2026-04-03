import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Users } from 'lucide-react'

import { Card, CardContent } from '../../components/ui/card.tsx'
import { useAdminStats } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin/stats')({
  component: AdminStats,
})

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af',
  UNCOMMON: '#4ade80',
  RARE: '#60a5fa',
  EPIC: '#c084fc',
  LEGENDARY: '#fbbf24',
}

const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}


function AdminStats() {
  const { data, isLoading } = useAdminStats()

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const totalUsers =
    data.skillDistribution.reduce((s, d) => s + d.count, 0)

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Statistiques</h1>

      {/* Row 1 — Joueurs actifs + Distribution raretés */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Joueurs actifs */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              Joueurs actifs
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/8 p-4 text-center">
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    7 jours
                  </span>
                </div>
                <p className="text-3xl font-black text-text">
                  {data.activeUsers.sevenDays.toLocaleString('fr-FR')}
                </p>
                {totalUsers > 0 && (
                  <p className="mt-1 text-xs text-text-light">
                    {((data.activeUsers.sevenDays / totalUsers) * 100).toFixed(
                      1,
                    )}
                    % des joueurs
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-secondary/8 p-4 text-center">
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-xs font-semibold text-secondary">
                    30 jours
                  </span>
                </div>
                <p className="text-3xl font-black text-text">
                  {data.activeUsers.thirtyDays.toLocaleString('fr-FR')}
                </p>
                {totalUsers > 0 && (
                  <p className="mt-1 text-xs text-text-light">
                    {((data.activeUsers.thirtyDays / totalUsers) * 100).toFixed(
                      1,
                    )}
                    % des joueurs
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dérive rareté */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              Dérive drop rates — réel vs théorique
            </p>
            <div className="space-y-2.5">
              {data.rarityDrift.map(
                ({ rarity, realCount, realPct, theoreticalPct }) => {
                  const drift = realPct - theoreticalPct
                  const color = RARITY_COLORS[rarity] ?? '#6b7280'
                  return (
                    <div key={rarity}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color }}>
                          {RARITY_LABELS[rarity] ?? rarity}
                        </span>
                        <div className="flex items-center gap-3 text-text-light">
                          <span>
                            théo.{' '}
                            <span className="font-mono text-text">
                              {theoreticalPct.toFixed(2)}%
                            </span>
                          </span>
                          <span>
                            réel{' '}
                            <span className="font-mono text-text">
                              {realPct.toFixed(2)}%
                            </span>{' '}
                            <span className="text-xs text-text-light">
                              ({realCount.toLocaleString('fr-FR')})
                            </span>
                          </span>
                          <span
                            className={`font-mono font-bold ${Math.abs(drift) > 2 ? 'text-destructive' : 'text-text-light'}`}
                          >
                            {drift >= 0 ? '+' : ''}
                            {drift.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
                        {theoreticalPct > 0 && (
                          <div
                            className="absolute h-full rounded-full opacity-30"
                            style={{
                              width: `${Math.min(theoreticalPct, 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        )}
                        {realPct > 0 && (
                          <div
                            className="absolute h-full rounded-full"
                            style={{
                              width: `${Math.min(realPct, 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
            {data.rarityDrift.every((r) => r.realCount === 0) && (
              <p className="mt-3 text-center text-xs text-text-light">
                Aucun pull enregistré
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Distribution compétences */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            Distribution des compétences
          </p>
          {data.skillDistribution.length === 0 ? (
            <p className="text-center text-xs text-text-light">Aucune compétence investie</p>
          ) : (
            <div className="space-y-1.5">
              {data.skillDistribution.map(({ nodeId, level, count }) => (
                <div key={`${nodeId}-${level}`} className="flex items-center gap-2">
                  <span className="w-40 truncate text-xs font-mono text-text-light">{nodeId}</span>
                  <span className="w-12 text-right text-xs font-mono text-text-light">Niv.{level}</span>
                  <span className="w-10 text-right text-xs font-mono text-text">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3 — Cartes jamais tirées */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
              Cartes jamais tirées
              {data.neverPulledCards.length > 0 && (
                <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">
                  {data.neverPulledCards.length}
                </span>
              )}
            </p>
          </div>
          {data.neverPulledCards.length === 0 ? (
            <p className="text-sm text-text-light">
              Toutes les cartes ont été tirées au moins une fois.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {data.neverPulledCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: RARITY_COLORS[card.rarity] ?? '#6b7280',
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {card.name}
                  </span>
                  <span className="flex-shrink-0 text-xs text-text-light">
                    {card.setName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
