// ArcadeCard — conteneur blanc partagé pour les sections de page sur fond
// crème. Reprend la spec « .sc-group » du handoff : radius 22 px, fond
// blanc, bordure ténue, ombre douce, padding généreux. Utilisé sur
// /achievements (sections par famille), /collection, /leaderboard, /team
// pour qu'un même rythme visuel sépare les blocs de contenu.

import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

const baseStyle: React.CSSProperties = {
  background: '#fff',
  borderColor: 'rgba(27,23,38,.06)',
  boxShadow:
    '0 2px 0 rgba(27,23,38,.03), 0 16px 36px -20px rgba(27,23,38,.12)',
}

export function ArcadeCard({
  className,
  style,
  children,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={`rounded-[22px] border p-[22px_24px] sm:p-[26px_28px_28px] ${className ?? ''}`}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </div>
  )
}
