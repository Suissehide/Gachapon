import { Handle, type NodeProps, Position } from '@xyflow/react'
import * as Icons from 'lucide-react'

import type { SkillNode as SkillNodeType } from '../../api/skills.api.ts'

export type SkillNodeData = {
  node: SkillNodeType
  userLevel: number
  branchColor: string
  canInvest: boolean
  isLocked: boolean
  missingPrereqs: string[]
  onInvest?: (nodeId: string) => void
  isAdmin?: boolean
}

function LucideIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = (Icons as any)[name]
  return Icon ? <Icon size={size} /> : null
}

export function SkillNodeComponent({ data }: NodeProps) {
  const {
    node,
    userLevel,
    branchColor,
    canInvest,
    isLocked,
    missingPrereqs,
    onInvest,
    isAdmin,
  } = data as SkillNodeData

  const dots = Array.from({ length: node.maxLevel }, (_, i) => (
    <div
      key={i}
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: i < userLevel ? branchColor : '#d1d5db' }}
    />
  ))

  const handleClick = () => {
    if (!isLocked && canInvest && userLevel < node.maxLevel) {
      onInvest?.(node.id)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isLocked ? `Prérequis : ${missingPrereqs.join(', ')}` : node.description
      }
      className="group relative flex w-[90px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-center transition-all"
      style={{
        borderColor: isLocked ? '#374151' : branchColor,
        background: '#ffffff',
        opacity: isLocked ? 0.45 : 1,
        boxShadow:
          !isLocked && canInvest && userLevel < node.maxLevel
            ? `0 0 12px ${branchColor}66`
            : 'none',
      }}
    >
      {/* Handles on all 4 sides: source (to start connections) + target (to receive connections) */}
      {(
        [
          { pos: Position.Top, s: 's-top', t: 't-top' },
          { pos: Position.Right, s: 's-right', t: 't-right' },
          { pos: Position.Bottom, s: 's-bottom', t: 't-bottom' },
          { pos: Position.Left, s: 's-left', t: 't-left' },
        ] as const
      ).map(({ pos, s, t }) => (
        <span key={s}>
          <Handle
            id={t}
            type="target"
            position={pos}
            style={
              isAdmin
                ? {
                    width: 10,
                    height: 10,
                    background: 'transparent',
                    border: 'none',
                    zIndex: 0,
                  }
                : { opacity: 0, pointerEvents: 'none' }
            }
          />
          {isAdmin && (
            <Handle
              id={s}
              type="source"
              position={pos}
              style={{
                width: 10,
                height: 10,
                background: branchColor,
                border: '2px solid #fff',
                zIndex: 1,
              }}
            />
          )}
        </span>
      ))}

      <div style={{ color: isLocked ? '#6b7280' : branchColor }}>
        <LucideIcon name={node.icon} size={18} />
      </div>
      <span className="w-full truncate text-xs font-semibold text-gray-900">
        {node.name}
      </span>
      <div className="flex gap-0.5">{dots}</div>
      {isLocked && (
        <Icons.Lock
          size={10}
          className="absolute right-1 top-1 text-gray-500"
        />
      )}
    </button>
  )
}
