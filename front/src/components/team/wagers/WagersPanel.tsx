// Section duels & paris de la fiche d'équipe. Reprend
// `docs/design_handoff_duels/reference/equipe-duels.css` (`.dz`).
//
// Deux cartes sœurs côte à côte, l'historique réglé en pleine largeur
// dessous. La bascule en une colonne se fait sur la largeur du CONTENEUR
// (`@container`), pas du viewport : la section vit dans la colonne droite de
// la fiche, qui rétrécit bien avant l'écran — un `@media` se déclencherait
// toujours trop tard.
//
// Les deux cartes s'étirent à la même hauteur (comportement par défaut de la
// grille) : c'est voulu par le handoff, deux sœurs et non un panneau haut à
// côté d'un panneau court.
//
// Aucun rafraîchissement n'est piloté ici : `useWagers` sonde toutes les dix
// secondes tant qu'un duel est ACTIVE et `useWagersLive` invalide sur les
// événements WebSocket (duels comme paris).
import { useMemo, useState } from 'react'

import type { TeamMember } from '../../../api/teams.api.ts'
import type { DuelView } from '../../../api/wagers.api.ts'
import { busyUserIds } from '../../../libs/duel.ts'
import { useSettledDuel } from '../../../queries/useSettledDuel.ts'
import {
  useAcceptDuel,
  useCancelDuel,
  useDeclineDuel,
  useWagers,
  useWagersLive,
} from '../../../queries/useWagers.ts'
import { ArcadeCard } from '../../shared/ArcadeCard.tsx'
import { BetPlacePopup } from '../BetPlacePopup.tsx'
import { DuelProposePopup } from '../DuelProposePopup.tsx'
import { DuelResultPopup } from '../DuelResultPopup.tsx'
import { BetCard } from './BetCard.tsx'
import { DuelCard } from './DuelCard.tsx'
import { SettledHistory } from './SettledHistory.tsx'

const OPEN_STATUSES: DuelView['status'][] = ['PENDING', 'ACTIVE']

function isOpen(duel: DuelView): boolean {
  return OPEN_STATUSES.includes(duel.status)
}

/**
 * Raison pour laquelle je ne peux pas défier. Le handoff ne prévoit qu'un
 * libellé (« UN DUEL À LA FOIS »), mais l'action peut aussi être impossible
 * faute d'adversaire libre : ce que la maquette fixe est le traitement
 * visuel — une pilule discrète plutôt qu'un gros bouton grisé — pas la
 * phrase. Renvoie `null` quand rien ne bloque.
 */
function duelLockReason(
  iAmBusy: boolean,
  availableOpponents: number,
): string | null {
  if (iAmBusy) {
    return 'UN DUEL À LA FOIS'
  }
  return availableOpponents === 0 ? 'AUCUN COÉQUIPIER LIBRE' : null
}

export function WagersPanel({
  teamId,
  members,
}: {
  teamId: string
  members: TeamMember[]
}) {
  const { data, isLoading, isError, error } = useWagers(teamId)
  useWagersLive(teamId)
  const [proposeOpen, setProposeOpen] = useState(false)
  const [betOpen, setBetOpen] = useState(false)
  const teamIds = useMemo(() => [teamId], [teamId])
  const settled = useSettledDuel(teamIds, data?.settledDuels)
  const acceptDuel = useAcceptDuel(teamId)
  const declineDuel = useDeclineDuel(teamId)
  const cancelDuel = useCancelDuel(teamId)
  // `variables` d'une mutation react-query = l'identifiant du duel en vol.
  const inFlightDuelId =
    [acceptDuel, declineDuel, cancelDuel].find((m) => m.isPending)?.variables ??
    null

  if (isLoading) {
    return (
      <ArcadeCard>
        <p className="text-center text-text-light">Chargement des duels…</p>
      </ArcadeCard>
    )
  }
  if (isError || !data) {
    return (
      <ArcadeCard>
        <p className="text-center text-destructive">
          {error instanceof Error
            ? error.message
            : "Impossible de charger les duels de l'équipe."}
        </p>
      </ArcadeCard>
    )
  }

  const open = data.duels.filter(isOpen)
  // Le serveur garantit « un duel ouvert par joueur » : il ne peut donc y en
  // avoir qu'un où je suis partie. `find` le dit mieux qu'un filtre suivi
  // d'un index.
  const mine = open.find((duel) => duel.myRole !== 'SPECTATOR') ?? null
  const spectated = open.filter((duel) => duel.myRole === 'SPECTATOR')

  const busy = busyUserIds(data.duels)
  // Quand je ne suis pas occupé, je ne figure pas dans `busy` : le seul
  // membre libre à retrancher du décompte, c'est donc moi.
  const availableOpponents =
    members.filter((m) => !busy.has(m.userId)).length - 1
  const lockReason = duelLockReason(mine !== null, availableOpponents)

  // Un pari, contrairement à un duel, peut viser un coéquipier déjà engagé
  // dans un autre pari : le seul blocage visible côté client est l'absence de
  // coéquipier tout court, les plafonds de paris ouverts restent une affaire
  // du serveur (non exposés par `/economy/config`).
  const canBet = members.length > 1

  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-4 @max-[760px]:grid-cols-1">
        <DuelCard
          mine={mine}
          spectated={spectated}
          canChallenge={lockReason === null}
          lockedReason={lockReason ?? ''}
          onChallenge={() => setProposeOpen(true)}
          onAccept={acceptDuel.mutate}
          onDecline={declineDuel.mutate}
          onCancel={cancelDuel.mutate}
          inFlightDuelId={inFlightDuelId}
        />

        <BetCard
          bets={data.bets}
          canBet={canBet}
          lockedReason="AUCUN COÉQUIPIER"
          onBet={() => setBetOpen(true)}
        />

        <div className="col-span-full">
          <SettledHistory
            teamId={teamId}
            settledDuels={data.settledDuels}
            settledBets={data.settledBets}
          />
        </div>
      </div>

      <DuelProposePopup
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        teamId={teamId}
        members={members}
        duels={data.duels}
      />

      <BetPlacePopup
        open={betOpen}
        onOpenChange={setBetOpen}
        teamId={teamId}
        members={members}
      />

      {settled.duel !== null && (
        <DuelResultPopup
          duel={settled.duel}
          transferredCount={settled.transferredCount}
          onClose={settled.close}
        />
      )}
    </div>
  )
}
