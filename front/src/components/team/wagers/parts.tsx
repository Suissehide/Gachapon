// Pièces partagées par les deux cartes sœurs de la section duels/paris.
// Reprend `docs/design_handoff_duels/reference/equipe-duels.css` (`.dz-card`,
// `.dz-head`, `.dz-locked`, `.dz-empty`).
//
// Ce fichier existe parce que les deux cartes ont EXACTEMENT le même
// squelette — même coque, même en-tête à trois lignes, même état vide — et
// ne diffèrent que par leur contenu. Les écrire deux fois aurait garanti
// qu'une retouche du handoff n'en atteigne qu'une.
//
// La coque n'est pas `ArcadeCard` : le handoff donne aux cartes de cette
// section un padding et une ombre plus serrés (`20px 22px 18px`, ombre à
// -24px) que les blocs de page. Étendre `ArcadeCard` d'une variante aurait
// mêlé deux échelles — un conteneur de section et une carte dans une
// section — sous un même nom.
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../../libs/utils.ts'
import { buttonVariants } from '../../ui/button.tsx'
import { PanelTitle, SectionLabel } from '../../ui/sectionHeading.tsx'

export function WagerCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[22px] border-[1.5px] border-foreground/8 bg-card px-[22px] pb-[18px] pt-5 shadow-[0_2px_0_rgba(27,23,38,0.03),0_16px_34px_-24px_rgba(27,23,38,0.16)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * En-tête d'une carte : label, titre, phrase d'explication, action à droite.
 *
 * `action` reçoit soit un bouton, soit une `LockedPill` — jamais un bouton
 * grisé. C'est l'intention centrale du handoff : « un gros bloc ambré grisé
 * attire l'œil sur ce qu'on ne peut pas faire ».
 */
export function WagerCardHead({
  label,
  title,
  note,
  action,
}: {
  label: string
  title: string
  note: string
  action: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3.5">
      <div className="min-w-0">
        <SectionLabel>{label}</SectionLabel>
        <PanelTitle className="mt-1 text-[22px] tracking-[-0.02em]">
          {title}
        </PanelTitle>
        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-foreground/50 [text-wrap:pretty]">
          {note}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

/**
 * Pilule mono qui remplace une action impossible, et sert aussi à porter
 * l'échéance d'un duel.
 *
 * Le handoff ne prévoit qu'un seul libellé (« UN DUEL À LA FOIS »), mais
 * l'action peut être bloquée pour une autre raison — aucun coéquipier libre.
 * Le texte est donc une prop : ce que la maquette fixe, c'est le traitement
 * visuel, pas la phrase.
 */
export function LockedPill({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        // La MEME recette que le bouton `mono`, empruntée à la primitive
        // plutôt que recopiée : cette pilule remplace une action, elle doit
        // lui ressembler au pixel. `span` et non `button` parce qu'elle
        // n'est justement pas cliquable.
        buttonVariants({ variant: 'mono', size: 'mono' }),
        'whitespace-nowrap',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

/** État vide : un carré d'icône et une phrase, dans un encadré pointillé. */
export function WagerEmpty({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-foreground/14 px-[18px] py-6 text-center">
      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-surface-2 text-foreground/35">
        <Icon className="h-4 w-4" />
      </span>
      <p className="max-w-[30ch] text-[12.5px] leading-[1.45] text-foreground/50 [text-wrap:pretty]">
        {children}
      </p>
    </div>
  )
}
