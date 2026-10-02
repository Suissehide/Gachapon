import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'

export interface SegmentedControlOption<T extends string> {
  value: T
  /** Texte ou contenu riche (pastille, compteur…) ; le bouton porte `aria-pressed`. */
  label: ReactNode
  icon?: ReactNode
  /**
   * Couleur CSS propre à cette option — typiquement un `var(--rarity-*)`.
   * Quand elle est fournie, l'option sélectionnée prend cette teinte au lieu
   * de l'ambre par défaut, et l'option au repos en garde une trace sur son
   * libellé.
   *
   * Passée en style inline et non en classe : la valeur n'est connue qu'à
   * l'exécution, donc aucune classe Tailwind ne peut être générée pour elle
   * au build. Les opacités passent par `color-mix` pour rester dérivées
   * d'une seule teinte plutôt que d'exiger cinq variantes par rareté.
   */
  color?: string
  /** Option visible mais non sélectionnable (grisée, ignorée au clic). */
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Étire chaque option pour remplir la largeur du conteneur */
  stretch?: boolean
  /** Laisse les options passer sur plusieurs lignes si la largeur manque */
  wrap?: boolean
  className?: string
  /**
   * Classes ajoutées à chaque option (gabarit plus grand, état actif via
   * `aria-pressed:` / `group-aria-pressed:` sur un contenu riche).
   */
  optionClassName?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  stretch = false,
  wrap = false,
  className,
  optionClassName,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-xl border border-border bg-muted p-0.5',
        wrap && 'flex flex-wrap',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        const tint = option.color
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-disabled={option.disabled}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'cursor-pointer flex items-center justify-center gap-1.5 h-8 rounded-lg px-3 py-2 text-xs font-semibold border border-transparent transition-all duration-150',
              stretch && 'flex-1',
              isActive
                ? 'bg-primary/10 border-primary/25 text-text'
                : 'text-text-light hover:bg-background/50 hover:text-text',
              // L'option active reste lisible même désactivée : c'est la sélection.
              option.disabled &&
                !isActive &&
                'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-light',
              optionClassName,
            )}
            style={
              tint === undefined
                ? undefined
                : isActive
                  ? {
                      background: `color-mix(in srgb, ${tint} 14%, transparent)`,
                      borderColor: `color-mix(in srgb, ${tint} 40%, transparent)`,
                      color: tint,
                    }
                  : { color: `color-mix(in srgb, ${tint} 70%, transparent)` }
            }
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
