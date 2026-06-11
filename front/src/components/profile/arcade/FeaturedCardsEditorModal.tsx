// front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx
import { X } from 'lucide-react'
import { useState } from 'react'

import { useUserCollection } from '../../../queries/useCollection'
import { useSetFeaturedCardsMutation } from '../../../queries/useProfile'
import { useAuthStore } from '../../../stores/auth.store'
import { CardArt } from './cardArt'
import type { ArcadeRarity } from './utils'

type Props = {
  open: boolean
  initialIds: string[]
  onClose: () => void
  onSaved?: () => void
}

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

export function FeaturedCardsEditorModal({ open, initialIds, onClose, onSaved }: Props) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: collection } = useUserCollection(userId)
  const mutation = useSetFeaturedCardsMutation()
  const [selected, setSelected] = useState<string[]>(initialIds.slice(0, 5))

  if (!open) {
    return null
  }

  // Dedupe by cardId — featured uses cardId (the same card across variants counts once).
  const ownedById = new Map<
    string,
    { id: string; name: string; rarity: ArcadeRarity; setName: string; imageUrl: string | null }
  >()
  for (const uc of collection?.cards ?? []) {
    if (!ownedById.has(uc.card.id)) {
      ownedById.set(uc.card.id, {
        id: uc.card.id,
        name: uc.card.name,
        rarity: uc.card.rarity as ArcadeRarity,
        setName: uc.card.set.name,
        imageUrl: uc.card.imageUrl,
      })
    }
  }
  const owned = Array.from(ownedById.values()).sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, id]
    })
  }

  const save = async () => {
    await mutation.mutateAsync(selected)
    onSaved?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="arcade-theme max-w-4xl w-[92%] max-h-[85vh] rounded-2xl bg-[var(--arcade-surface)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--arcade-border)]">
          <div>
            <h2 className="font-display text-xl font-extrabold">Cartes vedettes</h2>
            <p className="font-mono text-xs text-[var(--arcade-text-muted)]">
              {selected.length} / 5 sélectionnées · clique pour ajouter / retirer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--arcade-surface-2)]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {owned.map((c) => {
            const isSelected = selected.includes(c.id)
            const order = selected.indexOf(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`relative text-left ${isSelected ? 'ring-2 ring-[var(--arcade-amber)] rounded-xl' : ''}`}
                style={{ opacity: !isSelected && selected.length >= 5 ? 0.4 : 1 }}
                disabled={!isSelected && selected.length >= 5}
              >
                <CardArt rarity={c.rarity} name={c.name} setName={c.setName} imageUrl={c.imageUrl} />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--arcade-amber)] text-white text-xs font-bold flex items-center justify-center font-mono">
                    {order + 1}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-[var(--arcade-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--arcade-border-strong)] font-medium"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--arcade-amber), #ec4899)',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
            }}
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
