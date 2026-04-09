import { Handle, Position, type NodeProps } from '@xyflow/react'
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
  const { node, userLevel, branchColor, canInvest, isLocked, missingPrereqs, onInvest, isAdmin } =
    data as SkillNodeData

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
    <div
      onClick={handleClick}
      title={isLocked ? `Prérequis : ${missingPrereqs.join(', ')}` : node.description}
      className="group relative flex min-w-[80px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 text-center transition-all"
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
      <Handle
        type="target"
        position={Position.Left}
        style={
          isAdmin
            ? {
                width: 16,
                height: 16,
                background: '#fff',
                border: `2px solid ${branchColor}`,
              }
            : { opacity: 0, pointerEvents: 'none' }
        }
      >
        {isAdmin && (
          <Icons.ArrowRight
            size={10}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ color: branchColor }}
          />
        )}
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        style={
          isAdmin
            ? {
                width: 16,
                height: 16,
                background: branchColor,
                border: '2px solid #fff',
              }
            : { opacity: 0, pointerEvents: 'none' }
        }
      >
        {isAdmin && (
          <Icons.ArrowRight
            size={10}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
          />
        )}
      </Handle>

      <div style={{ color: isLocked ? '#6b7280' : branchColor }}>
        <LucideIcon name={node.icon} size={18} />
      </div>
      <span className="text-xs font-semibold text-gray-900">{node.name}</span>
      <div className="flex gap-0.5">{dots}</div>
      {isLocked && (
        <Icons.Lock size={10} className="absolute right-1 top-1 text-gray-500" />
      )}
    </div>
  )
}
