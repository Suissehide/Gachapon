import { Handle, Position } from '@xyflow/react'
import { Hexagon } from 'lucide-react'

const SOURCE_HANDLES = [
  { id: 's-top', position: Position.Top },
  { id: 's-right', position: Position.Right },
  { id: 's-bottom', position: Position.Bottom },
  { id: 's-left', position: Position.Left },
] as const

export function CenterNode() {
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

      {/* Full-cover invisible target handle: drop a wire anywhere on the
          center node to register it as the target. */}
      <Handle
        id="t-center"
        type="target"
        position={Position.Left}
        style={{
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          transform: 'none',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
        }}
      />

      {/* Visible source handles fan out on each side. */}
      {SOURCE_HANDLES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          style={{
            width: 14,
            height: 14,
            background: '#fff',
            border: '2px solid #6c47ff',
            zIndex: 1,
          }}
        />
      ))}
    </div>
  )
}

// Pick which side of the center node a child should hang off, based on its
// position relative to (0, 0). Used so the auto-rendered "center → child"
// edges fan out from the four sides instead of all stacking on one point.
export function pickCenterSourceHandle(posX: number, posY: number): string {
  const angle = Math.atan2(posY, posX) // -PI..PI
  const PI_4 = Math.PI / 4
  if (angle >= -PI_4 && angle < PI_4) return 's-right'
  if (angle >= PI_4 && angle < 3 * PI_4) return 's-bottom'
  if (angle >= -3 * PI_4 && angle < -PI_4) return 's-top'
  return 's-left'
}
