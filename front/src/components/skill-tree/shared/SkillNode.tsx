import { Handle, type NodeProps, Position } from '@xyflow/react'
import * as Icons from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { SkillNode as SkillNodeType } from '../../../api/skills.api.ts'
import { EFFECT_DESCRIPTIONS } from '../../../constants/skills.constant.ts'

export type SkillNodeData = {
  node: SkillNodeType
  userLevel: number
  branchColor: string
  canInvest: boolean
  isLocked: boolean
  missingPrereqs: string[]
  isAdmin?: boolean
}

function LucideIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = (Icons as any)[name]
  return Icon ? <Icon size={size} /> : null
}

function NodeTooltip({
  node,
  userLevel,
  isLocked,
  missingPrereqs,
  branchColor,
}: {
  node: SkillNodeType
  userLevel: number
  isLocked: boolean
  missingPrereqs: string[]
  branchColor: string
}) {
  const currentEffect = node.levels.find((l) => l.level === userLevel)
  const nextEffect = node.levels.find((l) => l.level === userLevel + 1)
  const isMaxed = userLevel >= node.maxLevel
  const effectDesc = EFFECT_DESCRIPTIONS[node.effectType] ?? node.effectType

  return (
    <>
      <p className="font-semibold text-white">{node.name}</p>
      {node.description && (
        <p className="mt-0.5 text-gray-400">{node.description}</p>
      )}

      <div className="mt-1.5 border-t border-gray-700 pt-1.5">
        <p className="text-gray-400">{effectDesc}</p>
        {currentEffect && userLevel > 0 && (
          <p className="mt-0.5">
            Actuel :{' '}
            <span className="font-semibold" style={{ color: branchColor }}>
              {currentEffect.effect}
            </span>
          </p>
        )}
        {!isMaxed && nextEffect && (
          <p className="mt-0.5">
            Niv. {userLevel + 1} :{' '}
            <span className="font-semibold text-green-400">
              {nextEffect.effect}
            </span>
          </p>
        )}
        {isMaxed && (
          <p className="mt-0.5 font-semibold text-yellow-400">Niveau max</p>
        )}
      </div>

      {isLocked && missingPrereqs.length > 0 && (
        <div className="mt-1.5 border-t border-gray-700 pt-1.5 text-red-400">
          Prérequis : {missingPrereqs.join(', ')}
        </div>
      )}

      <p className="mt-1 text-gray-500">
        {userLevel} / {node.maxLevel}
      </p>
    </>
  )
}

function PortalTooltip({
  buttonEl,
  children,
}: {
  buttonEl: HTMLElement
  children: React.ReactNode
}) {
  const rect = buttonEl.getBoundingClientRect()
  return (
    <div
      className="pointer-events-none fixed w-48 rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-left text-xs text-gray-200 shadow-xl"
      style={{
        zIndex: 99999,
        left: rect.left + rect.width / 2 - 96,
        top: rect.top - 8,
        transform: 'translateY(-100%)',
      }}
    >
      {/* Arrow */}
      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-gray-700 bg-gray-900" />
      {children}
    </div>
  )
}

export function SkillNodeComponent({ data }: NodeProps) {
  const {
    node,
    userLevel,
    branchColor,
    canInvest,
    isLocked,
    missingPrereqs,
    isAdmin,
  } = data as SkillNodeData

  const [hovered, setHovered] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const dots = Array.from({ length: node.maxLevel }, (_, i) => (
    <div
      key={i}
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: i < userLevel ? branchColor : '#d1d5db' }}
    />
  ))

  return (
    <button
      ref={buttonRef}
      type="button"
      onMouseEnter={() => !isAdmin && setHovered(true)}
      onMouseLeave={() => !isAdmin && setHovered(false)}
      title={isAdmin ? node.description : undefined}
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
      {/* Handles on all 4 sides */}
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
                ? { width: 10, height: 10, background: 'transparent', border: 'none', zIndex: 0 }
                : { width: 0, height: 0, opacity: 0, pointerEvents: 'none' }
            }
          />
          <Handle
            id={s}
            type="source"
            position={pos}
            style={
              isAdmin
                ? { width: 10, height: 10, background: branchColor, border: '2px solid #fff', zIndex: 1 }
                : { width: 0, height: 0, opacity: 0, pointerEvents: 'none' }
            }
          />
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

      {/* Tooltip joueur — rendu via portal pour échapper au z-index des noeuds React Flow */}
      {!isAdmin && hovered && buttonRef.current &&
        createPortal(
          <PortalTooltip buttonEl={buttonRef.current}>
            <NodeTooltip
              node={node}
              userLevel={userLevel}
              isLocked={isLocked}
              missingPrereqs={missingPrereqs}
              branchColor={branchColor}
            />
          </PortalTooltip>,
          document.body,
        )}
    </button>
  )
}
