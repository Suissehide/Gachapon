// RaidHistoryPanel — « Raids passés », dernier bloc du rail gauche de la
// fiche d'équipe. Reprend `docs/design_handoff_equipe/equipe.css`
// (`.tmB-histrow`, `.tm-hist-w`, `.tm-hist-bar`, `.tm-hist-p`) et la
// composition de `HistoryRows` : grille 38px/1fr/46px, gap 10px, barre 6px
// verte à 100 %, ambrée en dessous.
//
// Le nombre de lignes n'est pas un choix d'affichage : le serveur en renvoie
// au plus `teamRaid.historyLimit` (6 aujourd'hui). On rend ce qui arrive.
import dayjs from 'dayjs'

import type { TeamRaidHistoryEntry } from '../../api/teamProgression.api.ts'
import { cn } from '../../libs/utils.ts'
import { useTeamRaidHistory } from '../../queries/useTeamProgression.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { SectionLabel } from '../ui/sectionHeading.tsx'

/**
 * `weekKey` est le lundi UTC de la semaine au format `YYYY-MM-DD`
 * (`raidWeekKey`, back/domain/raid/raid-rules.ts) — pas un numéro de
 * semaine. Le « S36 » de la maquette se calcule donc ici, en semaine ISO
 * (le plugin `isoWeek` est déjà branché dans `main.tsx`).
 */
function weekLabel(weekKey: string): string {
  return `S${dayjs.utc(weekKey).isoWeek()}`
}

function HistoryRow({ raid }: { raid: TeamRaidHistoryEntry }) {
  const pct = Math.min(100, Math.max(0, raid.pct))
  const killed = pct >= 100

  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)_46px] items-center gap-2.5">
      <span className="font-mono text-[10px] tracking-[0.14em] text-foreground/45">
        {weekLabel(raid.weekKey)}
      </span>

      <div className="min-w-0">
        <span className="block truncate font-display text-[12.5px] font-bold text-text">
          {raid.bossName}
        </span>
        <div className="mt-[5px] h-1.5 overflow-hidden rounded-[3px] bg-foreground/8">
          <div
            className={cn(
              'h-full rounded-[3px]',
              killed ? 'bg-success' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <span className="text-right font-mono text-[10px] font-bold text-foreground/55">
        {pct} %
      </span>
    </div>
  )
}

export function RaidHistoryPanel({ teamId }: { teamId: string }) {
  const { data, isLoading } = useTeamRaidHistory(teamId)
  const raids = data?.raids ?? []
  // `killedAt` plutôt que `pct === 100`. Non pas parce que les deux
  // divergeraient : `raidPct` PLANCHERISE (`Math.floor`, raid-rules.ts), donc
  // 100 % implique bel et bien que le boss est tombé. Mais `killedAt` est le
  // FAIT posé par le serveur et `pct` n'en est qu'une dérivée : compter les
  // victoires sur le pourcentage, ce serait faire dépendre ce compteur d'une
  // règle d'arrondi qui ne lui appartient pas et qui peut changer sans que
  // personne ne pense à ce panneau.
  const won = raids.filter((raid) => raid.killedAt !== null).length

  return (
    <ArcadeCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionLabel as="h2">Raids passés</SectionLabel>
        {raids.length > 0 && (
          <span className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-foreground/45">
            {won} / {raids.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="font-mono text-[10px] tracking-[0.06em] text-foreground/45">
          Chargement de l'historique…
        </p>
      ) : raids.length === 0 ? (
        <p className="text-[12.5px] leading-[1.5] text-foreground/55">
          Aucun raid dans l'historique.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {raids.map((raid) => (
            <HistoryRow key={raid.weekKey} raid={raid} />
          ))}
        </div>
      )}
    </ArcadeCard>
  )
}
