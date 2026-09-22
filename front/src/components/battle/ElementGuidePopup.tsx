import { Crosshair, Sparkles, Swords } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  type CardElement,
  ELEMENT_COLOR,
  ELEMENT_ICON,
  ELEMENT_LABELS,
} from '../../constants/card.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

// Cycle de 4 dans l'ordre horaire du schéma : chaque élément bat le suivant
// (cf. `BEATS` dans back/src/main/domain/combat/element.ts). Lumière et
// Ténèbres vivent hors du cycle, en paire miroir.
const WHEEL: CardElement[] = ['FIRE', 'NATURE', 'EARTH', 'WATER']

// Positions des quatre nœuds sur le cercle, en pourcentage du conteneur carré
// (centre 50/50, rayon 32 %) — mêmes valeurs que le viewBox 0 0 100 100 du SVG,
// pour que pastilles et arcs restent alignés quelle que soit la largeur.
const NODE_POS = [
  { left: '50%', top: '18%' },
  { left: '82%', top: '50%' },
  { left: '50%', top: '82%' },
  { left: '18%', top: '50%' },
]

// Arcs orientés entre deux nœuds voisins, tronqués de 25° de chaque côté pour
// ne pas passer sous les pastilles. La pointe déborde de l'arc (cf. `refX` du
// marqueur), d'où les 25° plutôt que les 22° du rayon utile.
const ARCS = [
  'M 63.52 21.00 A 32 32 0 0 1 79.00 36.48',
  'M 79.00 63.52 A 32 32 0 0 1 63.52 79.00',
  'M 36.48 79.00 A 32 32 0 0 1 21.00 63.52',
  'M 21.00 36.48 A 32 32 0 0 1 36.48 21.00',
]

function fmtMult(mult: number): string {
  return formatNumber(mult, currentLocale(), { maximumFractionDigits: 2 })
}

function ElementChip({
  element,
  size = 'md',
}: {
  element: CardElement
  size?: 'md' | 'sm'
}) {
  const Icon = ELEMENT_ICON[element]
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`flex ${box} items-center justify-center rounded-full text-white`}
        style={{
          background: ELEMENT_COLOR[element],
          boxShadow: `0 6px 16px -8px ${ELEMENT_COLOR[element]}`,
        }}
      >
        <Icon className={icon} />
      </span>
      <span className="font-display text-[12px] font-bold leading-none text-text">
        {ELEMENT_LABELS[element]}
      </span>
    </span>
  )
}

function ElementWheel() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[288px]">
      {/* Trois pièges de rendu, trois parades :
          — l'encre des flèches est OPAQUE (`color-mix` du texte sur la carte)
            et non un alpha : deux peintures translucides se cumulent là où
            tige et tête se chevauchent, et laissent en plus remonter les
            pointillés du cercle repère au travers de la pointe ;
          — `refX` en retrait du sommet (2,9 sur 4,2) pour que le bout de la
            tige, capuchon rond compris, tombe DANS le triangle : à hauteur
            du sommet la tête est plus fine que le trait et le laisserait
            dépasser en oreilles ;
          — `currentColor` partout, pour que le cercle repère, les arcs et
            les pointes se retouchent d'une seule valeur. */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        style={{ color: 'color-mix(in srgb, var(--text) 55%, var(--card))' }}
        aria-hidden
      >
        <title>Roue élémentaire</title>
        <defs>
          <marker
            id="element-wheel-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="2.9"
            refY="3"
            orient="auto"
          >
            <path d="M 0 1.1 L 4.2 3 L 0 4.9 z" fill="currentColor" />
          </marker>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        {ARCS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            markerEnd="url(#element-wheel-arrow)"
          />
        ))}
      </svg>
      {WHEEL.map((element, i) => (
        <span
          key={element}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={NODE_POS[i]}
        >
          <ElementChip element={element} />
        </span>
      ))}
    </div>
  )
}

function MultPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5"
      style={{ borderColor: `${tone}33`, background: `${tone}0f` }}
    >
      <span
        className="font-display text-[17px] font-extrabold leading-none"
        style={{ color: tone }}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-light/70">
        {label}
      </span>
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

/**
 * Explication des règles élémentaires : roue des avantages, multiplicateurs de
 * dégâts (lus depuis la config économie, jamais codés en dur) et priorité de
 * ciblage appliquée par le simulateur de combat.
 */
export function ElementGuidePopup({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const adv = economy.combat.elementAdvantageMult
  const dis = economy.combat.elementDisadvantageMult

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent
        size="lg"
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden"
      >
        <PopupHeader>
          <PopupTitle
            icon={<Swords className="h-4 w-4" />}
            subtitle="Roue des avantages et priorité de ciblage"
          >
            Éléments
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-4 overflow-y-auto">
          <Section
            icon={<Sparkles className="h-3 w-3 text-amber-600" />}
            title="Roue élémentaire"
          >
            <ElementWheel />
            <p className="m-0 text-center text-[13px] leading-relaxed text-text-light">
              Chaque élément domine celui que la flèche désigne : le feu brûle
              la nature, la nature fissure la terre, la terre absorbe l'eau,
              l'eau éteint le feu.
            </p>

            <div className="mt-4 flex items-center justify-center gap-4 rounded-xl border border-border bg-background px-4 py-3">
              <ElementChip element="LIGHT" size="sm" />
              <span className="font-display text-lg font-bold text-text-light/50">
                ⇄
              </span>
              <ElementChip element="DARK" size="sm" />
              <p className="m-0 max-w-[180px] text-[12px] leading-snug text-text-light">
                Hors cycle : lumière et ténèbres se dominent mutuellement.
              </p>
            </div>
          </Section>

          <Section
            icon={<Swords className="h-3 w-3 text-amber-600" />}
            title="Dégâts"
          >
            <div className="flex gap-2">
              <MultPill
                label="Avantage"
                value={`×${fmtMult(adv)}`}
                tone="#10b981"
              />
              <MultPill label="Neutre" value="×1" tone="#8b8492" />
              <MultPill
                label="Désavantage"
                value={`×${fmtMult(dis)}`}
                tone="#e11d48"
              />
            </div>
            <p className="m-0 mt-2.5 text-[13px] leading-relaxed text-text-light">
              Le multiplicateur s'applique à chaque coup, selon l'élément de
              l'attaquant face à celui de sa cible. Une unité sans élément reste
              toujours neutre, dans les deux sens.
            </p>
          </Section>

          <Section
            icon={<Crosshair className="h-3 w-3 text-amber-600" />}
            title="Priorité de ciblage"
          >
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] leading-relaxed text-text-light">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>
                  Une unité attaque{' '}
                  <strong className="text-text">en priorité</strong> un ennemi
                  qu'elle domine. S'il y en a plusieurs, la cible est tirée au
                  hasard parmi eux.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>
                  Si aucun ennemi n'est dominé, la cible est tirée au hasard
                  parmi tous les survivants.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>
                  Les attaques de zone touchent toute l'équipe adverse : la
                  priorité ne s'applique pas, mais le multiplicateur si.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>
                  Les éléments ennemis sont affichés avant le combat : compose
                  ton équipe pour les contrer, et évite d'offrir des cibles
                  faciles.
                </span>
              </li>
            </ul>
          </Section>
        </PopupBody>

        <PopupFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Compris
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
