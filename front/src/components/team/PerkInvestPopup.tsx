// PerkInvestPopup — dépense d'un point de bonus d'équipe. Non designé dans le
// handoff (la maquette montre l'arbre en lecture seule) : construit sur la
// primitive `ui/popup.tsx`, comme `CreateTeamPopup` et `InviteMemberPopup`.
//
// RÈGLE ABSOLUE DE CETTE PAGE — aucune commande désactivée muette. Chaque
// bouton « Investir » grisé est doublé d'un libellé français qui dit
// POURQUOI il l'est (bonus verrouillé, rang au maximum, plus aucun point),
// et le déclencheur lui-même disparaît plutôt que de s'afficher grisé quand
// il n'y a rien à dépenser.
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import type { TeamPerkState } from '../../api/teamProgression.api.ts'
import {
  PERK_META,
  perkDescription,
} from '../../constants/teamPerks.constant.ts'
import { plural } from '../../libs/utils.ts'
import { useSpendPerk } from '../../queries/useTeamProgression.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../ui/popup.tsx'

type PerkInvestPopupProps = {
  teamId: string
  perks: TeamPerkState[]
  perkPoints: number
}

/**
 * Raison de blocage d'un bonus, ou `null` s'il est investissable.
 * L'ordre compte : un bonus verrouillé le reste même quand l'équipe a des
 * points, et le manque de points ne se dit qu'en dernier — c'est la seule
 * raison qui disparaîtra toute seule au prochain niveau.
 */
function blockedReason(perk: TeamPerkState, perkPoints: number): string | null {
  if (!perk.unlocked) {
    return `Se débloque au niveau ${perk.unlockLevel} de l'équipe`
  }
  if (perk.rank >= perk.maxRank) {
    return 'Rang maximum atteint'
  }
  if (perkPoints <= 0) {
    return 'Aucun point de bonus disponible'
  }
  return null
}

export function PerkInvestPopup({
  teamId,
  perks,
  perkPoints,
}: PerkInvestPopupProps) {
  const [open, setOpen] = useState(false)
  const {
    mutate: spend,
    isPending,
    variables: pendingKey,
  } = useSpendPerk(teamId)

  // Le déclencheur demande DEUX conditions, pas une : des points en main, et
  // au moins un bonus capable d'en prendre un. Une équipe qui a rempli ses
  // vingt rangs n'ouvre plus une modale dont les quatre rangées disent
  // « rang maximum atteint » — c'est la commande morte que cette page
  // s'interdit partout ailleurs. Le serveur ne crédite plus de point
  // au-delà de la capacité (`grantablePerkPoints`) ; cette garde couvre les
  // équipes qui en avaient déjà accumulé avant.
  const hasRoom = perks.some((perk) => perk.rank < perk.maxRank)

  return (
    <Popup open={open} onOpenChange={setOpen}>
      {perkPoints > 0 && hasRoom ? (
        <PopupTrigger
          variant="default"
          className="mt-3 h-auto w-full rounded-lg px-[18px] py-[11px] text-sm font-bold"
        >
          <Sparkles className="h-4 w-4" />
          Investir {perkPoints} point{plural(perkPoints)}
        </PopupTrigger>
      ) : hasRoom ? null : (
        // Une équipe sans point en main ne lit rien : l'absence du bouton dit
        // déjà tout. Seul le plafond mérite une phrase, parce que lui ne se
        // lèvera jamais et qu'il explique pourquoi les points cessent d'arriver.
        <p className="mt-3 text-center font-mono text-[10px] leading-[1.5] tracking-[0.06em] text-foreground/45">
          Tous les bonus sont au rang maximum.
        </p>
      )}

      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle
            icon={<Sparkles className="h-4 w-4" />}
            subtitle="Un point monte un bonus d'un rang. Seul le chef peut ensuite tout remettre à zéro, depuis le pied du panneau des bonus."
          >
            Investir un point de bonus
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-2.5">
          {perks.map((perk) => {
            const meta = PERK_META[perk.key]
            const { Icon } = meta
            const thisPending = isPending && pendingKey === perk.key
            // Un investissement en cours grise TOUTES les rangées (le serveur
            // n'a pas encore décompté le point). Sans cette seconde branche,
            // les trois autres boutons deviendraient des boutons gris muets
            // le temps de l'aller-retour — exactement ce que cette page
            // s'interdit.
            const reason =
              blockedReason(perk, perkPoints) ??
              (isPending && !thisPending ? 'Investissement en cours…' : null)

            return (
              <div
                key={perk.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] text-white"
                  style={{ background: meta.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-display text-sm font-extrabold text-text">
                      {meta.name}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.18em] text-foreground/50">
                      {perk.rank}/{perk.maxRank}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-[1.45] text-foreground/60">
                    {perkDescription(perk)}
                  </p>
                </div>

                <div className="flex w-[150px] shrink-0 flex-col items-end gap-1">
                  <Button
                    type="button"
                    size="sm"
                    disabled={reason !== null || isPending}
                    onClick={() => spend(perk.key)}
                  >
                    {thisPending ? 'Investissement…' : 'Investir'}
                  </Button>
                  {reason && (
                    <span className="text-right text-[10px] leading-[1.3] text-text-light">
                      {reason}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </PopupBody>

        <PopupFooter className="items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-foreground/50">
            {perkPoints} POINT{plural(perkPoints).toUpperCase()} RESTANT
            {plural(perkPoints).toUpperCase()}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Fermer
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
