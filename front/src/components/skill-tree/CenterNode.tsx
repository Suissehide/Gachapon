import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Hexagon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type BranchInfo = { id: string; name: string; color: string }

export type CenterNodeData = {
  branchByHandle: Record<string, BranchInfo | undefined>
  onRenameBranch?: (branchId: string, newName: string) => void
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

function BranchLabel({
  branch,
  onRename,
}: {
  branch?: BranchInfo
  onRename?: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!branch) return null

  const save = () => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== branch.name) onRename?.(branch.id, trimmed)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="nodrag w-20 rounded border bg-white px-1 text-center text-xs"
        style={{ borderColor: branch.color, color: branch.color }}
      />
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        setValue(branch.name)
        setEditing(true)
      }}
      className="nodrag nopan cursor-text whitespace-nowrap rounded bg-white px-2 py-0.5 text-xs font-semibold shadow-sm hover:underline"
      style={{ color: branch.color, border: `1px solid ${branch.color}22` }}
    >
      {branch.name}
    </span>
  )
}

export function CenterNode({ data }: NodeProps) {
  const { branchByHandle, onRenameBranch } = (data ?? {}) as CenterNodeData

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
              style={{ width: 14, height: 14, background: 'transparent', border: 'none', zIndex: 0 }}
            />
            <Handle
              id={`s-${key}`}
              type="source"
              position={position}
              style={{
                width: 14,
                height: 14,
                background: '#fff',
                border: `2px solid ${color}`,
                zIndex: 1,
              }}
            />
            <div style={{ position: 'absolute', ...label, pointerEvents: 'all' }}>
              <BranchLabel branch={branch} onRename={onRenameBranch} />
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

// Pick the best source/target handle pair for an edge between two nodes.
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
