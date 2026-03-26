import { Check, Copy, ExternalLink, FileImage, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { isApiError } from '../../../libs/httpErrorHandler'
import { useToast } from '../../../hooks/useToast'

import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'
import { Card } from '../../ui/card'
import { Input } from '../../ui/input'

interface MediaDetailPanelProps {
  item: MediaItem
  onDelete: (key: string) => void
  isDeleting?: boolean
  onCreateCard?: () => void
  onRename: (from: string, newName: string) => Promise<void>
  isRenaming?: boolean
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-text-light',
  UNCOMMON: 'text-green-400',
  RARE: 'text-accent',
  EPIC: 'text-secondary',
  LEGENDARY: 'text-primary',
}

export function MediaDetailPanel({
  item,
  onDelete,
  isDeleting,
  onCreateCard,
  onRename,
  isRenaming,
}: MediaDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filename = item.key.split('/').pop() ?? item.key

  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  const handleStartEdit = () => {
    setRenameValue(nameWithoutExt)
    setRenameError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setRenameError(null)
  }

  const handleSubmitRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === nameWithoutExt) {
      handleCancelEdit()
      return
    }
    try {
      await onRename(item.key, trimmed)
      setIsEditing(false)
      setRenameError(null)
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setRenameError('Ce nom est déjà utilisé')
      } else {
        setIsEditing(false)
        toast({
          title: 'Erreur',
          message: err instanceof Error ? err.message : 'Erreur lors du renommage',
          severity: 'error',
        })
      }
    }
  }
  const sizeKb = (item.size / 1024).toFixed(0)
  const date = new Date(item.lastModified).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.url)
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
    <div className="flex flex-col gap-3">
      {/* Preview */}
      <div
        className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg border border-border"
        style={{
          backgroundImage:
            'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%)',
          backgroundSize: '16px 16px',
        }}
      >
        <img
          src={item.url}
          alt={filename}
          className="max-h-full max-w-full object-contain p-3 drop-shadow-md"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.opacity = '0.3'
          }}
        />
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          title="Ouvrir l'image"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <div
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            item.orphan
              ? 'bg-red-500/80 text-white'
              : 'bg-green-600/80 text-white'
          }`}
        >
          {item.orphan ? 'Orpheline' : 'Utilisée'}
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-3 shadow-none">
        <div className="mb-2 flex items-center gap-1.5">
          <FileImage className="h-3 w-3 text-text-light" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-light">
            Fichier
          </span>
        </div>
        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Input
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value)
                  setRenameError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitRename()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                disabled={isRenaming}
                className="h-7 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSubmitRename}
                disabled={isRenaming}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-green-400 hover:bg-green-400/10 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isRenaming}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-light hover:bg-muted disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {renameError && (
              <p className="text-[11px] text-red-400">{renameError}</p>
            )}
          </div>
        ) : (
          <div className="group flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-text" title={filename}>
              {filename}
            </p>
            <button
              type="button"
              onClick={handleStartEdit}
              className="shrink-0 text-text-light opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
              title="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        <p
          className="mt-0.5 truncate text-[11px] text-text-light/70"
          title={item.key}
        >
          {item.key}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-text-light">
          <span>{sizeKb} Ko</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{date}</span>
        </div>
      </Card>

      {/* Associated card */}
      {!item.orphan && item.card && (
        <Card className="p-3 shadow-none">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-light">
            Carte associée
          </p>
          <p
            className={`text-sm font-semibold ${RARITY_COLORS[item.card.rarity] ?? 'text-text'}`}
          >
            {item.card.name}
            {item.card.variant && (
              <span className="ml-1.5 text-xs font-normal text-text-light">
                {item.card.variant}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-text-light">
            {item.card.rarity}
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {item.orphan && onCreateCard && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateCard}
            className="w-full gap-2 border-secondary/40 text-secondary hover:border-secondary/60 hover:text-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer une carte depuis ce média
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="w-full gap-2"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'URL copiée !' : "Copier l'URL"}
        </Button>

        <div className="mt-1 border-t border-border pt-2">
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression…' : 'Confirmer la suppression'}
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
              className={`w-full gap-2 ${
                item.orphan
                  ? 'border border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400'
                  : 'cursor-not-allowed opacity-40'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {item.orphan
                ? 'Supprimer ce média'
                : 'Média utilisé — non supprimable'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
