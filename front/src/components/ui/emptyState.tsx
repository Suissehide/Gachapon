// EmptyState — la boîte en pointillés qui remplace une liste vide : un carré
// d'icône, une phrase, et de quoi agir quand il y a quelque chose à faire.
//
// Cette recette existait déjà en trois exemplaires légèrement différents
// (`WagerEmpty` de la section duels, la collection vide de `TeamEditorPopup`,
// la liste d'équipes). Elle est ici pour qu'il n'y en ait pas une quatrième :
// un écran vide est un moment où l'on explique, et il doit s'expliquer de la
// même façon partout.
//
// `title` et `action` sont optionnels : dans une carte étroite, une phrase
// suffit ; sur une page entière, il faut un titre et un bouton.
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'

export function EmptyState({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon?: LucideIcon
  title?: ReactNode
  /** Bouton ou lien : omis quand l'écran n'attend rien du joueur. */
  action?: ReactNode
  className?: string
  /** La phrase d'explication. */
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-foreground/14 px-[18px] py-6 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-surface-2 text-foreground/35">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="flex flex-col gap-1">
        {title && (
          <p className="font-display text-sm font-bold text-text">{title}</p>
        )}
        {/* `max-w-[30ch]` : une explication se lit mal sur toute la largeur
            d'une page. `text-wrap: pretty` évite le mot orphelin. */}
        <p className="max-w-[40ch] text-[12.5px] leading-[1.45] text-foreground/50 [text-wrap:pretty]">
          {children}
        </p>
      </div>
      {action}
    </div>
  )
}
