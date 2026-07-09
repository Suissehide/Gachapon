// TEMPORARY dev-only preview for reveal animations. Not for production — delete
// when the reveal tuning is done. Public route so no auth/backend is needed.
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { RevealGrid } from '../components/machine/reveal/RevealGrid.tsx'
import type { PullBatchEntry } from '../queries/useGacha.ts'

export const Route = createFileRoute('/dev-reveal')({
  component: DevReveal,
})

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
const VARIANTS = ['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'] as const

function makeEntry(rarity: string, variant: string): PullBatchEntry {
  return {
    card: {
      id: `${rarity}-${variant}`,
      name: `${rarity} ${variant}`,
      imageUrl: null,
      rarity,
      variant: variant === 'NORMAL' ? null : variant,
      set: { id: 'dev', name: 'Preview' },
    },
    wasDuplicate: false,
    dustEarned: 0,
    pityCurrent: 0,
    wasFreePull: false,
    wasGoldenBall: false,
    wasBoostGuarantee: false,
  }
}

function mix10(): PullBatchEntry[] {
  return [
    makeEntry('COMMON', 'NORMAL'),
    makeEntry('UNCOMMON', 'NORMAL'),
    makeEntry('UNCOMMON', 'BRILLIANT'),
    makeEntry('RARE', 'NORMAL'),
    makeEntry('RARE', 'HOLOGRAPHIC'),
    makeEntry('EPIC', 'NORMAL'),
    makeEntry('EPIC', 'BRILLIANT'),
    makeEntry('LEGENDARY', 'NORMAL'),
    makeEntry('LEGENDARY', 'HOLOGRAPHIC'),
    makeEntry('COMMON', 'BRILLIANT'),
  ]
}

function DevReveal() {
  const [preview, setPreview] = useState<{
    results: PullBatchEntry[]
    seq: number
  } | null>(null)

  const show = (results: PullBatchEntry[]) =>
    setPreview((p) => ({ results, seq: (p?.seq ?? 0) + 1 }))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0a12',
        color: '#fff',
        padding: 24,
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
        Reveal preview (dev) — clique une carte pour jouer le burst
      </h1>
      <div style={{ display: 'grid', gap: 10 }}>
        {RARITIES.map((r) => (
          <div
            key={r}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <span style={{ width: 120, fontWeight: 700 }}>{r}</span>
            {VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => show([makeEntry(r, v)])}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#1b1726',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => show(mix10())}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #f59e0b',
            background: '#f59e0b',
            color: '#1b1726',
            fontWeight: 800,
            cursor: 'pointer',
            width: 'fit-content',
          }}
        >
          MIX x10
        </button>
      </div>

      {preview && (
        <RevealGrid
          key={preview.seq}
          results={preview.results}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
