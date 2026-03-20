import { createFileRoute } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { MediaDetailPanel } from '../../components/admin/media/MediaDetailPanel'
import { MediaGallery } from '../../components/admin/media/MediaGallery'
import { Button } from '../../components/ui/button'
import {
  type MediaItem,
  useAdminMedia,
  useDeleteMedia,
  useUploadMedia,
} from '../../queries/useAdminMedia'

export const Route = createFileRoute('/_admin/admin/media')({
  component: AdminMediaPage,
})

type Filter = 'all' | 'used' | 'orphan'

function AdminMediaPage() {
  const { data: items = [], isLoading } = useAdminMedia()
  const uploadMutation = useUploadMedia()
  const deleteMutation = useDeleteMedia()

  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter((item) => {
    if (filter === 'used') {
      return !item.orphan
    }
    if (filter === 'orphan') {
      return item.orphan
    }
    return true
  })

  const counts = {
    all: items.length,
    used: items.filter((i) => !i.orphan).length,
    orphan: items.filter((i) => i.orphan).length,
  }

  const handleToggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleFiles = (files: File[]) => {
    if (!files.length) {
      return
    }
    uploadMutation.mutate(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleBulkDelete = async () => {
    if (!confirmBulk) {
      setConfirmBulk(true)
      return
    }
    const keys = Array.from(selected)
    await deleteMutation.mutateAsync(keys)
    setSelected(new Set())
    setConfirmBulk(false)
    if (activeItem && keys.includes(activeItem.key)) {
      setActiveItem(null)
    }
  }

  const handleSingleDelete = async (key: string) => {
    await deleteMutation.mutateAsync([key])
    if (activeItem?.key === key) {
      setActiveItem(null)
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Médias</h1>

      {/* Zone upload */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop upload zone */}
      <div
        role="presentation"
        className={`mb-6 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-text-light" />
        <p className="text-sm text-text-light">
          Glisser-déposer des images ici, ou{' '}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => fileInputRef.current?.click()}
          >
            parcourir
          </button>
        </p>
        <p className="mt-1 text-xs text-text-light/60">
          JPEG, PNG, WEBP — 5 MB max par fichier
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        {uploadMutation.isPending && (
          <p className="mt-2 text-xs text-primary">Upload en cours…</p>
        )}
        {uploadMutation.data?.errors?.map((err) => (
          <p key={err.filename} className="mt-1 text-xs text-red-400">
            {err.filename} : {err.reason}
          </p>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {(['all', 'used', 'orphan'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary/20 text-primary'
                : 'text-text-light hover:bg-surface'
            }`}
          >
            {f === 'all' && `Toutes (${counts.all})`}
            {f === 'used' && `Utilisées (${counts.used})`}
            {f === 'orphan' && (
              <span className={filter === 'orphan' ? '' : 'text-red-400'}>
                Orphelines ({counts.orphan})
              </span>
            )}
          </button>
        ))}

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-text-light">
              {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
            </span>
            {confirmBulk ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deleteMutation.isPending}
                >
                  Confirmer la suppression
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmBulk(false)}
                >
                  Annuler
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                Supprimer ({selected.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Grille + panneau */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-text-light">
          Chargement…
        </div>
      ) : (
        <div
          className={`grid gap-4 ${activeItem ? 'grid-cols-[1fr_200px]' : 'grid-cols-1'}`}
        >
          <MediaGallery
            items={filtered}
            selectable
            selected={selected}
            onToggleSelect={handleToggleSelect}
            activeKey={activeItem?.key}
            onActivate={setActiveItem}
          />

          {activeItem && (
            <MediaDetailPanel
              key={activeItem.key}
              item={activeItem}
              onDelete={handleSingleDelete}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
}
