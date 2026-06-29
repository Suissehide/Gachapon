import { Heart, type LucideIcon, Shield, Sword, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'

import placeholderImg from '../../../assets/data/not-found.png'
import {
  ELEMENTS,
  type ElementDef,
  type ElementKey,
  getRarityTone,
  type RarityTone,
  STAT_DEFS,
  type StatKey,
} from './config.ts'

const STAT_ICONS: Record<StatKey, LucideIcon> = {
  pv: Heart,
  atq: Sword,
  def: Shield,
  vit: Zap,
}

// ── Props ──────────────────────────────────────────────────────────────────────

export type CardStats = Record<StatKey, number>

type Props = {
  rarity: string
  name: string
  /** Family / set label shown above the name as a small breadcrumb tag. */
  setName: string
  imageUrl?: string | null
  isOwned?: boolean
  /** Hidden in this design — kept for API compat with previous component. */
  variant?: string | null
  compact?: boolean
  /** When provided, renders the level square at the top of the right column. */
  level?: number | null
  /** When provided, renders the vertical stat pill column on the right. */
  stats?: CardStats | null
  /** When provided, renders the element pill above the family tag. */
  element?: ElementKey | null
  /** Description / lore / passive effect shown in the bottom area. */
  description?: string | null
  /** CSS `object-position` for the art image (e.g. `'50% 18%'`). */
  artPosition?: string
}

// Trapezoidal tag: straight left edge, right edge slanted toward the right
// (bottom-right pulled in so the slope goes `/`).
const TAG_CLIP_PATH = 'polygon(0 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'

// ── Component ──────────────────────────────────────────────────────────────────

export function TcgCardFace({
  rarity,
  name,
  setName,
  imageUrl,
  isOwned = true,
  compact = false,
  level,
  stats,
  element,
  description,
  artPosition,
}: Props) {
  const tone = getRarityTone(rarity)
  const elementDef = element ? ELEMENTS[element] : null
  const outerRadius = compact ? '8px' : '10px'

  const rootStyle = {
    '--rar': tone.hex,
    '--rar-light': tone.light,
    '--rar-dark': tone.dark,
  } as CSSProperties

  // Frame inset values — content (name, tag, stats) aligns to these edges.
  const frameInset = compact ? '6px' : '8px'

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_14px_30px_-18px_rgba(27,23,38,0.4)]"
      style={{ ...rootStyle, borderRadius: outerRadius }}
    >
      <img
        src={imageUrl || placeholderImg}
        alt={isOwned ? name : ''}
        className={`absolute inset-0 h-full w-full object-cover ${isOwned ? '' : 'opacity-50 grayscale'}`}
        style={{ objectPosition: artPosition ?? '50% 20%' }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = placeholderImg
        }}
      />
      {!isOwned && (
        <div className="pointer-events-none absolute inset-0 z-100 bg-black/40" />
      )}

      {/* Internal stylized frame — double outline + corner accents */}
      <InternalFrame compact={compact} />

      {/* Level — top-left, aligned with the inner frame */}
      {level !== null && level !== undefined && (
        <div className="absolute top-3 left-3 z-40">
          <LevelSquare level={level} tone={tone} compact={compact} />
        </div>
      )}

      {/* Bottom stack: family tag + name band + description.
       *  Stats column floats just above this stack, inset from the frame. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
        {!compact && stats && (
          <div
            className="absolute right-0 z-20 flex flex-col items-end gap-3"
            style={{
              bottom: 'calc(100% + 8px)',
            }}
          >
            {STAT_DEFS.map((def) => (
              <StatLine
                key={def.key}
                icon={STAT_ICONS[def.key]}
                color={def.color}
                value={stats[def.key]}
              />
            ))}
          </div>
        )}

        <FamilyHeader
          setName={setName}
          elementDef={elementDef}
          compact={compact}
          frameInset={frameInset}
        />
        <Band
          name={name}
          tone={tone}
          compact={compact}
          frameInset={frameInset}
        />
        <Description
          text={isOwned ? (description ?? null) : null}
          compact={compact}
        />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InternalFrame({ compact }: { compact: boolean }) {
  return (
    <>
      {/* Outer thin line */}
      <div
        className={`pointer-events-none absolute z-[5] border border-white/45 ${
          compact ? 'inset-[6px] rounded-[3px]' : 'inset-[8px] rounded-[4px]'
        }`}
      />
      {/* Inner faint line — gives the double-frame effect */}
      <div
        className={`pointer-events-none absolute z-[5] border border-white/15 ${
          compact ? 'inset-[9px] rounded-[2px]' : 'inset-[12px] rounded-[3px]'
        }`}
      />
      {/* Corner accents */}
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
        (corner) => (
          <CornerAccent key={corner} corner={corner} compact={compact} />
        ),
      )}
    </>
  )
}

function CornerAccent({
  corner,
  compact,
}: {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  compact: boolean
}) {
  const offset = compact ? '6px' : '8px'
  const size = compact ? '6px' : '8px'
  const styles: CSSProperties = { width: size, height: size }
  if (corner.includes('top')) {
    styles.top = offset
    styles.borderTop = '1.5px solid rgba(255,255,255,0.75)'
  } else {
    styles.bottom = offset
    styles.borderBottom = '1.5px solid rgba(255,255,255,0.75)'
  }
  if (corner.includes('left')) {
    styles.left = offset
    styles.borderLeft = '1.5px solid rgba(255,255,255,0.75)'
  } else {
    styles.right = offset
    styles.borderRight = '1.5px solid rgba(255,255,255,0.75)'
  }
  return <span className="pointer-events-none absolute z-[5]" style={styles} />
}

function LevelSquare({
  level,
  tone,
  compact,
}: {
  level: number
  tone: RarityTone
  compact: boolean
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-md border-[0.5px] border-white font-display font-extrabold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] ${
        compact ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-base'
      }`}
      style={{ background: tone.hex }}
    >
      {level}
    </div>
  )
}

function StatLine({
  icon: Icon,
  color,
  value,
}: {
  icon: LucideIcon
  color: string
  value: number
}) {
  return (
    <div className="flex items-center">
      {/* Icon on the left */}
      <div className="relative z-10">
        <Icon
          className="h-9 w-9 -scale-x-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          style={{ color }}
          strokeWidth={0.5}
          stroke="white"
          fill="currentColor"
        />
        {/* Value badge */}
        <span className="absolute -bottom-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-white bg-[#1b1726] font-display text-[10px] font-bold leading-none tabular-nums text-white shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
          {value}
        </span>
      </div>
      {/* Thick black line */}
      <div
        className="-ml-5 h-4.5 w-11 bg-[#1b1726] shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10px 100%)' }}
      />
    </div>
  )
}

function FamilyHeader({
  setName,
  elementDef,
  compact,
  frameInset,
}: {
  setName: string
  elementDef: ElementDef | null
  compact: boolean
  frameInset: string
}) {
  return (
    <div
      className={`relative z-10 flex flex-col items-start mb-1`}
      style={{ paddingLeft: frameInset, paddingRight: frameInset }}
    >
      {elementDef && (
        <div
          className={`relative z-10 flex items-center justify-center rounded-full text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${
            compact
              ? '-mb-1 h-6 w-5 border border-white'
              : '-mb-1.5 h-8 w-6.5 border-2 border-white'
          }`}
          style={{ background: '#1b1726' }}
          title={elementDef.name}
        >
          <elementDef.icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </div>
      )}
      <span
        className={`relative z-0 inline-block bg-[#1b1726] text-white ${
          compact ? 'px-1 py-0.5' : 'pl-1.5 pr-2.5 py-[3px]'
        }`}
        style={{
          clipPath: TAG_CLIP_PATH,
          marginLeft: elementDef ? (compact ? '5px' : '7px') : '0',
        }}
      >
        <span
          className={`block font-mono font-bold uppercase leading-none tracking-[0.16em] text-white/90 ${
            compact ? 'text-[5.5px]' : 'text-[7px]'
          }`}
        >
          {setName.toUpperCase()}
        </span>
      </span>
    </div>
  )
}

function Band({
  name,
  tone,
  compact,
  frameInset,
}: {
  name: string
  tone: RarityTone
  compact: boolean
  frameInset: string
}) {
  return (
    <div
      className={`relative z-20 flex shrink-0 items-center text-left text-white ${
        compact ? 'py-1.5 pl-1.5 pr-2' : 'py-2 pl-2 pr-3'
      }`}
      style={{
        marginLeft: frameInset,
        marginRight: frameInset,
        background: `linear-gradient(90deg, ${tone.hex} 0%, transparent 100%)`,
      }}
    >
      <span
        className={`min-w-0 max-w-full truncate font-display font-extrabold leading-none -tracking-[0.01em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] ${
          compact ? 'text-[12px]' : 'text-[17px]'
        }`}
      >
        {name}
      </span>
    </div>
  )
}

function Description({
  text,
  compact,
}: {
  text: string | null
  compact: boolean
}) {
  // Large keeps a constant min-height so all cards line up; compact only
  // reserves a tiny breathing space when there's no text.
  const minHeight = compact ? (text ? undefined : '10px') : '78px'
  return (
    <div
      className={`relative z-10 ${compact ? (text ? 'px-2 pt-2 pb-2' : 'px-2 py-1') : 'px-3.25 pt-4 pb-2.75'}`}
      style={minHeight ? { minHeight } : undefined}
    >
      {text && (
        <p
          className={`m-0 text-white leading-[1.42] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
            compact ? 'text-[9px]' : 'text-[12px]'
          }`}
        >
          {text}
        </p>
      )}
    </div>
  )
}
