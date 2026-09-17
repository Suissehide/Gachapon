// InfoButton — le bouton « ouvrir l'aide » d'un en-tête de page.
//
// Même rôle sur toutes les pages : une pastille discrète, posée dans le slot
// `right` de `PageHeader`, qui ouvre une popup explicative sans rien changer à
// l'état du joueur. « Taux de drop » (/play), « Bonus de sets » (/equipment),
// « Éléments » (/campaign, /tower).
//
// Ces quatre boutons avaient dérivé en trois recettes différentes (outline
// arrondi à la main, outline sm, pilule) alors qu'ils disent la même chose.
// La recette vit ici pour qu'il n'y ait plus qu'un endroit à changer — seule
// l'icône varie d'une page à l'autre.

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../ui/button.tsx'

type Props = {
  icon: LucideIcon
  children: ReactNode
  onClick: () => void
  /** Infobulle native — l'intitulé seul est parfois elliptique. */
  title?: string
}

export function InfoButton({ icon: Icon, children, onClick, title }: Props) {
  return (
    <Button
      type="button"
      variant="pill"
      size="pill"
      onClick={onClick}
      title={title}
    >
      <Icon className="h-3.5 w-3.5 text-amber-600" />
      {children}
    </Button>
  )
}
