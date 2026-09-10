// SectionLabel / PanelTitle — le couple d'en-tête que le handoff équipe
// (`docs/design_handoff_equipe/equipe.css`) répète au-dessus de chaque bloc :
// un sur-titre mono en petites majuscules très espacées, puis le titre
// display juste dessous.
//
//   `.tm-lab`  { font-family: mono; font-size: 10px; letter-spacing: .18em;
//                color: rgba(27,23,38,.5) }
//   `.tmB-h1`  { font-family: display; font-size: 34px; font-weight: 800;
//                letter-spacing: -.025em }
//
// Ces deux recettes étaient recopiées à l'identique dans le panneau de raid,
// celui des duels et la table des contributions. Trois copies, c'est la
// façon la plus sûre d'appliquer la prochaine retouche à deux endroits sur
// trois — d'où la primitive.
import { cva, type VariantProps } from 'class-variance-authority'
import {
  createElement,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import { cn } from '../../libs/utils.ts'

export const sectionLabelVariants = cva(
  'font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50',
)

export const panelTitleVariants = cva(
  'font-display font-extrabold tracking-[-0.025em] text-text',
  {
    variants: {
      size: {
        /** Titre de panneau (`Défis d'équipe`). */
        default: 'text-2xl',
        /** Titre principal de la colonne, `.tmB-h1` : le nom du boss. */
        lg: 'text-[34px] leading-tight',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

type SectionLabelProps = HTMLAttributes<HTMLElement> & {
  /**
   * Balise rendue. `span` par défaut : un sur-titre n'est pas un titre de
   * document, c'est une étiquette. Passer `h2`/`h3` quand le bloc n'a pas
   * de `PanelTitle` en dessous et que ce label EST son titre — c'est le cas
   * de « CONTRIBUTIONS » ou « RAIDS PASSÉS ».
   */
  as?: ElementType
  children: ReactNode
}

// `createElement` plutôt qu'un `<Tag>` en JSX : sur un `ElementType` non
// contraint, TypeScript intersecte les props de TOUTES les balises et le
// type de `children` s'effondre sur `never`. Le rendu est identique.
export function SectionLabel({
  as = 'span',
  className,
  children,
  ...rest
}: SectionLabelProps) {
  return createElement(
    as,
    { ...rest, className: cn(sectionLabelVariants(), className) },
    children,
  )
}

type PanelTitleProps = HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof panelTitleVariants> & {
    as?: ElementType
    children: ReactNode
  }

export function PanelTitle({
  as = 'h2',
  size,
  className,
  children,
  ...rest
}: PanelTitleProps) {
  return createElement(
    as,
    { ...rest, className: cn(panelTitleVariants({ size }), className) },
    children,
  )
}
