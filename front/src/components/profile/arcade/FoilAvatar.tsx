// front/src/components/profile/arcade/FoilAvatar.tsx
import { cn } from '../../../libs/utils'

type Props = {
  initials: string
  isMax?: boolean
  size?: number
  className?: string
}

export function FoilAvatar({ initials, isMax = false, size = 112, className }: Props) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-[24%]"
        style={{
          background:
            'conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #22c55e, #f59e0b)',
          animation: 'foilSpin 6s linear infinite',
          padding: 6,
          filter: isMax ? 'drop-shadow(0 0 14px rgba(245,158,11,.55))' : undefined,
        }}
      >
        <div
          className="h-full w-full rounded-[20%] flex items-center justify-center text-white font-display"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
            fontSize: size * 0.45,
            fontWeight: 800,
          }}
        >
          {initials}
        </div>
      </div>
      {isMax && (
        <div
          className="absolute -top-1 -right-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #fde68a, #f59e0b, #d97706)',
            color: '#422006',
            transform: 'rotate(8deg)',
            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
          }}
        >
          MAX
        </div>
      )}
    </div>
  )
}
