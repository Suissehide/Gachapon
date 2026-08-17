import {
  type CardElement,
  ELEMENT_COLOR,
  ELEMENT_ICON,
  ELEMENT_LABELS,
  ELEMENT_ORDER,
} from '../../constants/card.constant.ts'

/** Pastille de couleur seule — taille d'une puce de menu/Select. */
export function ElementDot({ element }: { element: CardElement }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: ELEMENT_COLOR[element] }}
    />
  )
}

/** Pictogramme + libellé, pour les listes et tableaux. */
export function ElementTag({ element }: { element: CardElement | null }) {
  if (!element) {
    return <span className="text-xs text-text-light/50">—</span>
  }
  const Icon = ELEMENT_ICON[element]
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
        style={{ background: ELEMENT_COLOR[element] }}
      >
        <Icon className="h-3 w-3" />
      </span>
      {ELEMENT_LABELS[element]}
    </span>
  )
}

/** Options `Select` des six éléments (sans entrée « aucun » : le Select est clearable). */
export const ELEMENT_SELECT_OPTIONS = ELEMENT_ORDER.map((element) => ({
  value: element,
  label: ELEMENT_LABELS[element],
  icon: <ElementDot element={element} />,
}))
