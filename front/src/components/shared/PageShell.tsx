// PageShell — squelette partagé pour les pages « Arcade clair ».
//
// Apporte le fond crème `#fbf8f3`, la décoration AuroraGrid (halos + grille
// fondue vers le beige) et le conteneur centré standard (max-w-5xl, padding
// horizontal/vertical aligné avec la spec du handoff).
//
// Usage :
//   <PageShell>
//     <PageHeader ... />
//     <Card>...</Card>
//   </PageShell>

import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'
import { AuroraGrid } from './decorations/AuroraGrid'

const WIDTHS = {
  // La largeur historique, celle contre laquelle les dix-neuf autres pages
  // ont été dessinées. Ne pas y toucher.
  default: 'max-w-5xl',
  // 80rem (1280 px), soit 1248 px de contenu une fois `px-4` retiré : la
  // maquette de la fiche d'équipe est dessinée sur un canvas de 1280 px à
  // 32 px de marges, donc ~1216 px de contenu. C'est le cran de l'échelle
  // Tailwind qui s'en approche le plus.
  wide: 'max-w-7xl',
} as const

type Props = {
  children: ReactNode
  /**
   * Largeur du conteneur centré. **Par défaut : inchangée** — toutes les
   * pages existantes gardent leur longueur de ligne au pixel près.
   *
   * `wide` existe pour la fiche d'équipe, **seul écran de l'application
   * réellement en deux colonnes** (rail fixe de 340 px + contenu). Dans la
   * largeur par défaut, sa colonne de droite tombe à 628 px : le portrait du
   * boss et la rangée de quatre paliers de récompense n'y tiennent pas, et
   * la grille des paliers se replierait en 2×2 par accident plutôt que par
   * décision de design.
   *
   * Élargir le défaut plutôt que d'utiliser cette prop reflowerait les
   * dix-neuf autres pages, qui ont toutes été dessinées contre `max-w-5xl`.
   * Ajouter une seconde prop de largeur ne ferait que dupliquer celle-ci :
   * si un troisième cran devient nécessaire, l'ajouter à `WIDTHS`.
   */
  width?: keyof typeof WIDTHS
}

export function PageShell({ children, width = 'default' }: Props) {
  return (
    <div
      className="relative min-h-[calc(100vh-var(--topbar-h))]"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      <AuroraGrid />
      <div
        className={cn(
          'relative z-10 mx-auto flex flex-col gap-[22px] px-4 py-8',
          WIDTHS[width],
        )}
      >
        {children}
      </div>
    </div>
  )
}
