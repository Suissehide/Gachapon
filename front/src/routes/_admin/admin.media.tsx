import { createFileRoute } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CreateCardSheet } from '../../components/admin/cards/CreateCardSheet'
import { MediaDetailPanel } from '../../components/admin/media/MediaDetailPanel'
import { MediaGallery } from '../../components/admin/media/MediaGallery'
import { Button } from '../../components/ui/button'
import { SegmentedControl } from '../../components/ui/segmentedControl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
import { useAdminCreateCard, useAdminSets } from '../../queries/useAdminCards'
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
  const { data: items = [], isLoading, isError } = useAdminMedia()
  const uploadMutation = useUploadMedia()
  const deleteMutation = useDeleteMedia()

  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null)

  const [createCardOpen, setCreateCardOpen] = useState(false)
  const createCardMutation = useAdminCreateCard()
  const { data: setsData } = useAdminSets()

  const [dragging, setDragging] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selected.size === 0) {
      setConfirmBulk(false)
    }
  }, [selected.size])

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
    setErrorMessage(null)
    if (!confirmBulk) {
      setConfirmBulk(true)
      return
    }
    const keys = Array.from(selected)
    try {
      await deleteMutation.mutateAsync(keys)
      setSelected(new Set())
      setConfirmBulk(false)
      if (activeItem && keys.includes(activeItem.key)) {
        setActiveItem(null)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur lors de la suppression',
      )
      setConfirmBulk(false)
    }
  }

  const handleSingleDelete = async (key: string) => {
    setErrorMessage(null)
    try {
      await deleteMutation.mutateAsync([key])
      if (activeItem?.key === key) {
        setActiveItem(null)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur lors de la suppression',
      )
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
            className="cursor-pointer text-primary underline"
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
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Toutes (${counts.all})` },
            { value: 'used', label: `Utilisées (${counts.used})` },
            { value: 'orphan', label: `Orphelines (${counts.orphan})` },
          ]}
        />

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
        {errorMessage && (
          <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
        )}
      </div>

      {/* Grille + panneau */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-text-light">
          Chargement…
        </div>
      ) : isError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 text-center">
          <p className="text-sm font-medium text-red-400">
            Impossible de charger les médias
          </p>
          <p className="text-xs text-text-light">
            Le service de stockage est peut-être inaccessible.
          </p>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-text-light">
              {items.length === 0
                ? 'Aucune image. Glissez des fichiers dans la zone ci-dessus pour commencer.'
                : 'Aucune image pour ce filtre.'}
            </div>
          ) : (
            <MediaGallery
              items={filtered}
              selectable
              selected={selected}
              onToggleSelect={handleToggleSelect}
              activeKey={activeItem?.key}
              onActivate={setActiveItem}
            />
          )}

          <Sheet
            open={!!activeItem}
            onOpenChange={(open) => {
              if (!open) {
                setActiveItem(null)
              }
            }}
          >
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Détail du média</SheetTitle>
              </SheetHeader>
              {activeItem && (
                <div className="mt-4 overflow-y-auto px-6 pb-6">
                  <MediaDetailPanel
                    key={activeItem.key}
                    item={activeItem}
                    onDelete={handleSingleDelete}
                    isDeleting={deleteMutation.isPending}
                    onCreateCard={() => setCreateCardOpen(true)}
                  />
                </div>
              )}
            </SheetContent>
          </Sheet>

          <CreateCardSheet
            open={createCardOpen}
            onOpenChange={setCreateCardOpen}
            sets={setsData?.sets ?? []}
            defaultImageUrl={activeItem?.orphan ? activeItem.url : undefined}
            onCreate={(fd) => createCardMutation.mutate(fd)}
          />
        </>
      )}
    </div>
  )
}
