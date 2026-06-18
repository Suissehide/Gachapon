import { Link } from '@tanstack/react-router'
import { Home, Search } from 'lucide-react'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'

import { AuroraGrid } from '../shared/decorations/AuroraGrid.tsx'
import { Button } from '../ui/button.tsx'

const CAPSULE_COLORS = [
  {
    bg: 'radial-gradient(circle at 35% 35%, #fde68a 0%, #f59e0b 50%, #92400e 100%)',
    shadow: 'rgba(217,119,6,0.25)',
  },
  {
    bg: 'radial-gradient(circle at 35% 35%, #ddd6fe 0%, #7c3aed 50%, #3b0764 100%)',
    shadow: 'rgba(124,58,237,0.25)',
  },
  {
    bg: 'radial-gradient(circle at 35% 35%, #a5f3fc 0%, #0891b2 50%, #0c4a6e 100%)',
    shadow: 'rgba(8,145,178,0.2)',
  },
  {
    bg: 'radial-gradient(circle at 35% 35%, #fce7f3 0%, #ec4899 50%, #831843 100%)',
    shadow: 'rgba(236,72,153,0.2)',
  },
  {
    bg: 'radial-gradient(circle at 35% 35%, #bbf7d0 0%, #22c55e 50%, #14532d 100%)',
    shadow: 'rgba(34,197,94,0.18)',
  },
]

function FloatingCapsule({ index }: { index: number }) {
  const style = useMemo(() => {
    const color = CAPSULE_COLORS[index % CAPSULE_COLORS.length]
    const size = 10 + Math.random() * 22
    const left = 5 + Math.random() * 90
    const duration = 16 + Math.random() * 18
    const delay = Math.random() * -20
    const drift = -40 + Math.random() * 80

    return {
      '--capsule-drift': `${drift}px`,
      width: size,
      height: size,
      left: `${left}%`,
      bottom: `-${size + 20}px`,
      background: color.bg,
      boxShadow: `0 4px 12px ${color.shadow}`,
      animation: `notfound-capsule-rise ${duration}s ${delay}s linear infinite`,
    } as CSSProperties
  }, [index])

  return <div className="absolute rounded-full opacity-30" style={style} />
}

/* ─── Open capsule SVG ──────────────────────────────────────────────────────── */

function OpenCapsule() {
  return (
    <svg viewBox="0 0 200 160" className="h-40 w-52 drop-shadow-md" fill="none">
      <ellipse cx="100" cy="148" rx="60" ry="6" className="fill-text/[0.04]" />
      <g>
        <path d="M60 82 A40 40 0 0 0 140 82" fill="url(#bottomGrad)" />
        <ellipse cx="100" cy="82" rx="40" ry="7" fill="url(#bandGrad)" />
        <ellipse
          cx="100"
          cy="82"
          rx="40"
          ry="7"
          stroke="#b45309"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          fill="none"
        />
        <ellipse cx="100" cy="88" rx="28" ry="10" fill="black" opacity="0.05" />
        <ellipse cx="90" cy="110" rx="12" ry="6" fill="white" opacity="0.1" />
      </g>
      <g transform="translate(24, -18) rotate(-30, 72, 68)">
        <path d="M32 68 A40 40 0 0 1 112 68" fill="url(#topGrad)" />
        <ellipse cx="72" cy="68" rx="40" ry="7" fill="url(#topBandGrad)" />
        <ellipse
          cx="72"
          cy="68"
          rx="40"
          ry="7"
          stroke="#0284c7"
          strokeWidth="0.6"
          strokeOpacity="0.3"
          fill="none"
        />
        <ellipse cx="58" cy="40" rx="12" ry="9" fill="white" opacity="0.3" />
        <ellipse cx="55" cy="36" rx="6" ry="4" fill="white" opacity="0.45" />
        <path
          d="M88 52 Q92 44 90 36"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
      </g>
      <g>
        <circle cx="78" cy="70" r="3" fill="#f59e0b" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="118" cy="65" r="2.5" fill="#8b5cf6" opacity="0.5">
          <animate
            attributeName="opacity"
            values="0.5;0.15;0.5"
            dur="2.5s"
            begin="0.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="95" cy="60" r="3.5" fill="#fbbf24" opacity="0.5">
          <animate
            attributeName="opacity"
            values="0.5;0.1;0.5"
            dur="3s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="108" cy="74" r="2" fill="#06b6d4" opacity="0.45">
          <animate
            attributeName="opacity"
            values="0.45;0.1;0.45"
            dur="2.2s"
            begin="1.2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="85" cy="58" r="2" fill="#f59e0b" opacity="0.35">
          <animate
            attributeName="opacity"
            values="0.35;0.08;0.35"
            dur="2.8s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <defs>
        <radialGradient
          id="bottomGrad"
          cx="100"
          cy="95"
          r="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <linearGradient
          id="bandGrad"
          x1="60"
          y1="82"
          x2="140"
          y2="82"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient
          id="topGrad"
          x1="32"
          y1="16"
          x2="112"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="40%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient
          id="topBandGrad"
          x1="32"
          y1="68"
          x2="112"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function NotFoundPage() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AuroraGrid />

      {/* Floating capsules */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <FloatingCapsule key={i} index={i} />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div
          className={`flex flex-col items-center text-center transition-all duration-500 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {/* Open capsule visual */}
          <div className="mt-4">
            <OpenCapsule />
          </div>

          {/* Big number — diagonal gradient */}
          <h1
            className="mt-3 font-display text-[160px] font-black leading-none tracking-tight sm:text-[200px]"
            style={{
              background:
                'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #ec4899 65%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 8px 28px rgba(245, 158, 11, 0.22))',
            }}
          >
            404
          </h1>

          {/* Title */}
          <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
            Cette page n'existe pas
          </p>

          {/* Description */}
          <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-text-light">
            La capsule que tu cherches s'est peut-être perdue en route, ou la
            machine ne l'a jamais distribuée.
          </p>

          {/* Actions */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="gradient" size="lg">
              <Link to="/">
                <Home size={16} />
                Retour à l'accueil
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/collection">
                <Search size={16} />
                Explorer la collection
              </Link>
            </Button>
          </div>

          {/* Footer code */}
          <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.3em] text-text-light/40">
            ERR::CAPSULE_NOT_FOUND — 0x194
          </p>
        </div>
      </div>
    </div>
  )
}
