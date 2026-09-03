import { Layers } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { EquipmentSetDefinition } from '../../api/equipment.api'
import { statColorVar } from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

/**
 * Explique le système de sets : quel bonus, à partir de combien de pièces, et
 * la règle qui se devine le moins — le comptage se fait PAR CARTE, pas sur
 * l'inventaire. Rien n'est écrit en dur : les tailles et les bonus viennent
 * de `GET /equipment/sets` (`useEquipmentSets`).
 *
 * Les sets sont regroupés par taille, parce que c'est la taille qui décide de
 * ce qu'on peut combiner sur les 7 emplacements d'une carte.
 */
export function SetBonusGuide({ sets }: { sets: EquipmentSetDefinition[] }) {
  const [open, setOpen] = useState(false)

  // Groupé par nombre de pièces, du plus petit au plus grand — l'ordre dans
  // lequel on compose une carte : on cale le gros set, puis le complément.
  const groupes = useMemo(() => {
    const parTaille = new Map<number, EquipmentSetDefinition[]>()
    for (const set of sets) {
      const liste = parTaille.get(set.pieces) ?? []
      liste.push(set)
      parTaille.set(set.pieces, liste)
    }
    return [...parTaille.entries()].sort((a, b) => a[0] - b[0])
  }, [sets])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Layers className="h-4 w-4" />
        Bonus de sets
      </Button>

      <Popup open={open} onOpenChange={setOpen}>
        <PopupContent size="lg">
          <PopupHeader>
            <PopupTitle
              icon={<Layers className="h-4 w-4" />}
              subtitle="Chaque set demande un nombre de pièces et donne un bonus."
            >
              Bonus de sets
            </PopupTitle>
          </PopupHeader>
          <PopupBody className="flex flex-col gap-4">
            {/* Les deux règles qui se devinent le moins, hors de la zone
                défilante : elles valent pour tous les sets. */}
            <p className="rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-sm text-text-light">
              Le compte se fait <b className="text-text">carte par carte</b> :
              deux pièces d'un set sur la même carte comptent, réparties sur
              deux cartes elles ne comptent pas. Chaque carte a{' '}
              <b className="text-text">7 emplacements</b>, de quoi porter deux
              sets à la fois — un 4 et un 3, ou un 4 et un 2. Porter plus de
              pièces que le set n'en demande n'apporte{' '}
              <b className="text-text">rien de plus</b>.
            </p>

            {/* Sept sets ne tiennent pas dans une fenêtre : la liste défile
                seule, l'intro et le pied restent visibles. */}
            <div className="-mr-1 flex max-h-[52vh] flex-col gap-4 overflow-y-auto pr-1">
              {groupes.map(([pieces, sets]) => (
                <div key={pieces}>
                  <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                    Sets de {pieces} pièces
                  </p>
                  <div className="flex flex-col gap-2">
                    {sets.map((set) => (
                      <SetRow key={set.key} set={set} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopupBody>
          <PopupFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </PopupFooter>
        </PopupContent>
      </Popup>
    </>
  )
}

function SetRow({ set }: { set: EquipmentSetDefinition }) {
  // Un set ne porte qu'une stat — même convention que la stat principale
  // d'une pièce, dont la fiche lit aussi la première clé de `bonuses`.
  const statKey = Object.keys(set.bonus.bonuses)[0] ?? ''

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border p-3"
      style={
        {
          '--sc': statColorVar(statKey),
          background: 'color-mix(in oklab, var(--sc) 8%, var(--card))',
        } as React.CSSProperties
      }
    >
      {/* Le nombre de pièces est l'information qu'on vient chercher : il est
          porté par une pastille, pas noyé dans une phrase. */}
      <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--sc)] font-mono text-[10px] font-extrabold tracking-[0.06em] text-white">
        {set.pieces} PC
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-base font-extrabold text-text">
        {set.label}
      </span>
      <span className="shrink-0 font-mono text-xs font-bold text-[color-mix(in_oklab,var(--sc)_72%,var(--text))]">
        {set.bonus.label}
      </span>
    </div>
  )
}
