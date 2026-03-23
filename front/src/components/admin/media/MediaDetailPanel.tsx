import { Check, Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'

interface MediaDetailPanelProps {
  item: MediaItem
  onDelete: (key: string) => void
  isDeleting?: boolean
  onCreateCard?: () => void
}

export function MediaDetailPanel({
  item,
  onDelete,
  isDeleting,
  onCreateCard,
}: MediaDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setConfirmDelete(false)
  }, [])

  const filename = item.key.split('/').pop() ?? item.key
  const sizeKb = (item.size / 1024).toFixed(0)
  const date = new Date(item.lastModified).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(item.key)
    setConfirmDelete(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <img
        src={item.url}
        alt={filename}
        className="aspect-[3/4] w-full rounded object-contain p-1"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.opacity = '0.3'
        }}
      />

      <div>
        <p
          className="truncate text-sm font-semibold text-text"
          title={filename}
        >
          {filename}
        </p>
        <p className="truncate text-xs text-text-light" title={item.key}>
          {item.key}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.orphan
              ? 'bg-red-500/10 text-red-500 border border-red-500/40'
              : 'bg-green-500/10 text-green-500 border border-green-500/40'
          }`}
        >
          {item.orphan ? 'Orpheline' : 'Utilisée'}
        </span>
      </div>

      {!item.orphan && item.card && (
        <div className="rounded-md bg-surface p-2 text-xs">
          <p className="mb-0.5 text-text-light uppercase tracking-wide text-[10px]">
            Carte associée
          </p>
          <p className="font-medium text-violet-400">
            {item.card.name}
            {item.card.variant && ` — ${item.card.variant}`}
          </p>
          <p className="text-text-light">{item.card.rarity}</p>
        </div>
      )}

      <p className="text-xs text-text-light">
        {sizeKb} Ko · {date}
      </p>

      {item.orphan && onCreateCard && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateCard}
          className="gap-2 border-violet-500/40 text-violet-400 hover:text-violet-400"
        >
          <Plus className="h-3 w-3" />
          Créer une carte
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copié !' : "Copier l'URL"}
      </Button>

      {confirmDelete ? (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Confirmer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(false)}
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={!item.orphan || isDeleting}
          onClick={handleDelete}
          className={`gap-2 ${item.orphan ? 'border border-red-500/30 text-red-400 hover:text-red-400' : 'cursor-not-allowed opacity-40'}`}
        >
          <Trash2 className="h-3 w-3" />
          Supprimer
        </Button>
      )}
    </div>
  )
}
