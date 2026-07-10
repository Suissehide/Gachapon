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
  VARIANT_OVERLAYS,
} from './config.ts'
import { HoloOverlay, useHoloPointer } from './HoloOverlay.tsx'

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
  /** BRILLIANT / HOLOGRAPHIC render full-art foil overlays over the image. */
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
  /** Hide the family tag + name band + description stack (art-only mode). */
  showName?: boolean
  /** Show a "NOUVEAU" badge in the top-right corner. Used by the pull reveal to
   *  flag first-time cards without extra external wrappers. */
  newBadge?: boolean
}

// Trapezoidal tag: straight left edge, right edge slanted toward the right
// (bottom-right pulled in so the slope goes `/`).
const TAG_CLIP_PATH = 'polygon(0 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'

const getFoilLayers = (variant: string | null | undefined, isOwned: boolean) =>
  isOwned && variant && variant !== 'NORMAL'
    ? (VARIANT_OVERLAYS[variant] ?? null)
    : null

// ── Component ──────────────────────────────────────────────────────────────────

export function TcgCardFace({
  rarity,
  name,
  setName,
  imageUrl,
  isOwned = true,
  variant,
  compact = false,
  level,
  stats,
  element,
  description,
  artPosition,
  showName = true,
  newBadge = false,
}: Props) {
  const tone = getRarityTone(rarity)
  const elementDef = element ? ELEMENTS[element] : null
  const outerRadius = compact ? '8px' : '10px'

  const overlayLayers = getFoilLayers(variant, isOwned)
  const isHolo = isOwned && variant === 'HOLOGRAPHIC'
  const { rootRef, holoActive, onHoloMouseMove, onHoloMouseLeave } =
    useHoloPointer()
  // Any foil variant tracks the pointer: HOLOGRAPHIC feeds <HoloOverlay />,
  // BRILLIANT feeds its `brilliant-glare` layer via the same CSS vars.
  const holoHandlers = overlayLayers
    ? { onMouseMove: onHoloMouseMove, onMouseLeave: onHoloMouseLeave }
    : undefined

  const rootStyle = {
    '--rar': tone.hex,
    '--rar-light': tone.light,
    '--rar-dark': tone.dark,
  } as CSSProperties

  // Frame inset values — content (name, tag, stats) aligns to these edges.
  const frameInset = compact ? '6px' : '8px'

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_14px_30px_-18px_rgba(27,23,38,0.4)]"
      style={{ ...rootStyle, borderRadius: outerRadius }}
      {...holoHandlers}
    >
      <img
        src={imageUrl || placeholderImg}
        alt={name}
        // Defer offscreen art so grids of hundreds of cards don't fire every
        // request at once — that burst is what makes MinIO drop/throttle some
        // and leaves them stuck on the placeholder.
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${isOwned ? '' : 'grayscale'}`}
        style={{ objectPosition: artPosition ?? '50% 20%' }}
        onError={(e) => {
          const img = e.currentTarget
          const retries = Number(img.dataset.retries ?? '0')
          // Retry once (cache-busted, small backoff) before giving up — a
          // transient failure under load shouldn't permanently show not-found.
          if (imageUrl && retries < 1) {
            img.dataset.retries = String(retries + 1)
            const sep = imageUrl.includes('?') ? '&' : '?'
            setTimeout(() => {
              img.src = `${imageUrl}${sep}retry=1`
            }, 600)
          } else {
            img.src = placeholderImg
          }
        }}
      />

      {/* Variant foil overlays — full-art layers over the image */}
      {overlayLayers?.map((layer) => (
        <div
          key={layer.id}
          className="pointer-events-none absolute inset-0 z-[2] transition-opacity duration-300"
          style={{
            background: layer.bg,
            backgroundSize: layer.bgSize,
            animation: layer.animation,
            mixBlendMode: layer.blendMode as CSSProperties['mixBlendMode'],
            opacity: layer.opacity,
          }}
        />
      ))}
      {isHolo && <HoloOverlay active={holoActive} />}

      {/* Internal stylized frame — double outline + corner accents */}
      <InternalFrame compact={compact} />

      {/* Level — top-left, aligned with the inner frame */}
      {level !== null && level !== undefined && (
        <div className="absolute top-3 left-3 z-40">
          <LevelSquare level={level} tone={tone} compact={compact} />
        </div>
      )}

      {/* NEW badge — top-right, for freshly pulled cards */}
      {newBadge && (
        <span className="absolute top-2 right-2 z-40 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/40">
          Nouveau
        </span>
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

        {showName && (
          <>
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
          </>
        )}
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
          compact ? 'pl-1 pr-2 py-0.5' : 'pl-1.5 pr-3.5 py-[3px]'
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
