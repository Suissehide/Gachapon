import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Hexagon, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { BRANCH_PALETTE } from '../../../constants/skills.constant.ts'
import { Button } from '../../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'

type BranchInfo = { id: string; name: string; color: string }

export type CenterNodeData = {
  branchByHandle: Record<string, BranchInfo | undefined>
  onUpdateBranch?: (branchId: string, data: { name?: string; color?: string }) => void
  onCreateBranch?: (handleKey: string) => void
  onDeleteBranch?: (branchId: string) => void
  isAdmin?: boolean
}

const HANDLES = [
  {
    key: 'top',
    position: Position.Top,
    label: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 } as const,
  },
  {
    key: 'right',
    position: Position.Right,
    label: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 } as const,
  },
  {
    key: 'bottom',
    position: Position.Bottom,
    label: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 } as const,
  },
  {
    key: 'left',
    position: Position.Left,
    label: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 } as const,
  },
] as const

function DeleteBranchPopup({
  branch,
  open,
  onOpenChange,
  onConfirm,
}: {
  branch: BranchInfo
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return createPortal(
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle>Supprimer la branche</PopupTitle>
        </PopupHeader>
        <PopupBody>
          <p className="text-sm text-text-light">
            Supprimer la branche <strong style={{ color: branch.color }}>{branch.name}</strong> et
            tous ses noeuds ? Les points investis par les joueurs seront remboursés.
          </p>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Supprimer
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>,
    document.body,
  )
}

function EditBranchPopup({
  branch,
  open,
  onOpenChange,
  onSave,
}: {
  branch: BranchInfo
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { name?: string; color?: string }) => void
}) {
  const [name, setName] = useState(branch.name)
  const [color, setColor] = useState(branch.color)

  useEffect(() => {
    if (open) {
      setName(branch.name)
      setColor(branch.color)
    }
  }, [open, branch.name, branch.color])

  return createPortal(
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle>Modifier la branche</PopupTitle>
        </PopupHeader>
        <PopupBody className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-light" htmlFor="branch-name">Nom</label>
            <input
              id="branch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-light" htmlFor="branch-color">Couleur</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {BRANCH_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: color === c ? '#fff' : 'transparent',
                      boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
              <label
                htmlFor="branch-color"
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-gray-400 bg-white transition-colors hover:border-purple-400"
                title="Couleur personnalisée"
              >
                <Plus size={12} className="text-gray-400" />
                <input
                  id="branch-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-light">Aperçu :</span>
            <span
              className="rounded bg-white px-2 py-0.5 text-xs font-semibold shadow-sm"
              style={{ color, border: `1px solid ${color}22` }}
            >
              {name || 'Sans nom'}
            </span>
          </div>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              const updates: { name?: string; color?: string } = {}
              if (name.trim() && name.trim() !== branch.name) {
                updates.name = name.trim()
              }
              if (color !== branch.color) {
                updates.color = color
              }
              if (Object.keys(updates).length > 0) {
                onSave(updates)
              }
              onOpenChange(false)
            }}
            disabled={!name.trim()}
          >
            Enregistrer
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>,
    document.body,
  )
}

function BranchLabel({
  branch,
  onUpdate,
  onDelete,
}: {
  branch: BranchInfo
  onUpdate?: (id: string, data: { name?: string; color?: string }) => void
  onDelete?: (id: string) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={
            onUpdate
              ? (e) => {
                  e.stopPropagation()
                  setEditOpen(true)
                }
              : undefined
          }
          className={`whitespace-nowrap rounded bg-white px-2 py-0.5 text-xs font-semibold shadow-sm ${onUpdate ? 'nodrag nopan cursor-pointer hover:underline' : ''}`}
          style={{ color: branch.color, border: `1px solid ${branch.color}22` }}
        >
          {branch.name}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteOpen(true)
            }}
            className="nodrag nopan flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
          >
            <X size={10} />
          </button>
        )}
      </span>

      {onUpdate && editOpen && (
        <EditBranchPopup
          branch={branch}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={(data) => onUpdate(branch.id, data)}
        />
      )}
      {onDelete && deleteOpen && (
        <DeleteBranchPopup
          branch={branch}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={() => onDelete(branch.id)}
        />
      )}
    </>
  )
}

function AddBranchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="nodrag nopan flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-dashed border-gray-400 bg-white text-gray-400 shadow-sm hover:border-purple-400 hover:text-purple-500"
    >
      <Plus size={12} />
    </button>
  )
}

export function CenterNode({ data }: NodeProps) {
  const { branchByHandle, onUpdateBranch, onCreateBranch, onDeleteBranch, isAdmin } =
    (data ?? {}) as CenterNodeData

  return (
    <div
      className="relative flex items-center justify-center rounded-full text-white shadow-lg"
      style={{
        width: 72,
        height: 72,
        background: 'linear-gradient(135deg,#6c47ff,#a78bfa)',
        boxShadow: '0 0 24px rgba(108, 71, 255, 0.45)',
      }}
    >
      <Hexagon size={28} className="pointer-events-none" />

      {HANDLES.map(({ key, position, label }) => {
        const branch = branchByHandle?.[key]
        const color = branch?.color ?? '#6c47ff'
        return (
          <span key={key}>
            <Handle
              id={`t-${key}`}
              type="target"
              position={position}
              style={
                isAdmin
                  ? { width: 14, height: 14, background: 'transparent', border: 'none', zIndex: 0 }
                  : { width: 0, height: 0, opacity: 0, pointerEvents: 'none' }
              }
            />
            <Handle
              id={`s-${key}`}
              type="source"
              position={position}
              style={
                isAdmin
                  ? { width: 14, height: 14, background: '#fff', border: `2px solid ${color}`, zIndex: 1 }
                  : { width: 0, height: 0, opacity: 0, pointerEvents: 'none' }
              }
            />
            <div style={{ position: 'absolute', ...label, pointerEvents: 'all' }}>
              {branch ? (
                <BranchLabel
                  branch={branch}
                  onUpdate={isAdmin ? onUpdateBranch : undefined}
                  onDelete={isAdmin ? onDeleteBranch : undefined}
                />
              ) : (
                isAdmin &&
                onCreateBranch && <AddBranchButton onClick={() => onCreateBranch(key)} />
              )}
            </div>
          </span>
        )
      })}
    </div>
  )
}

const ORDER_TO_HANDLE: Record<number, string> = { 1: 'top', 2: 'right', 3: 'bottom', 4: 'left' }
const HANDLE_TO_ORDER: Record<string, number> = { top: 1, right: 2, bottom: 3, left: 4 }

export function handleKeyForBranchOrder(order: number): string | undefined {
  return ORDER_TO_HANDLE[order]
}

export function branchOrderForHandleKey(key: string): number | undefined {
  return HANDLE_TO_ORDER[key]
}

export function pickHandles(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = toX - fromX
  const dy = toY - fromY
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 's-right', targetHandle: 't-left' }
      : { sourceHandle: 's-left', targetHandle: 't-right' }
  }
  return dy >= 0
    ? { sourceHandle: 's-bottom', targetHandle: 't-top' }
    : { sourceHandle: 's-top', targetHandle: 't-bottom' }
}
