// MemberAvatar — pastille d'un membre dans une liste. C'est un objet
// DISTINCT de `TeamEmblem`, pas une taille de plus : le handoff
// (`docs/design_handoff_equipe/equipe.css`) leur donne deux règles séparées.
//
//   `.tm-emblem`  76 px, radius 24 %, liseré interne blanc, dégradé saturé
//                 `hsl(H 95% 82%) → hsl(H 85% 58%)`, lettre BLANCHE ombrée.
//   `.tm-av`      34 px, radius 11 px, sans liseré, dégradé pastel
//                 `hsl(H 92% 88%) → hsl(H 88% 74%)`, lettre BRUNE.
//
// La teinte, surtout, ne vient pas de la même source : l'emblème lit la
// `hue` que le serveur stocke sur l'équipe, l'avatar la dérive de la
// POSITION de la ligne (`(index * 47) % 360` dans `MemberTable`). Deux
// listes triées différemment donnent donc deux jeux de couleurs, et c'est
// voulu : la teinte sert à distinguer des lignes voisines à l'œil, pas à
// identifier un joueur. Tordre `TeamEmblem` pour couvrir les deux aurait
// mélangé une identité persistée et une décoration de tableau.
import { cn } from '../../libs/utils.ts'

/**
 * Pas de tour complet en douze lignes, et pas de deux voisins proches : 47
 * est premier avec 360, donc la suite `i * 47` parcourt 360 teintes
 * distinctes avant de boucler. Valeur reprise telle quelle du handoff.
 */
const HUE_STEP = 47

type MemberAvatarProps = {
  /** Lettre affichée (généralement la première du pseudo). */
  letter: string
  /** Rang de la ligne dans la liste — c'est lui qui donne la teinte. */
  index: number
  /** Côté du carré en pixels. Défaut 34 px, la valeur de `.tm-av`. */
  size?: number
  className?: string
}

export function MemberAvatar({
  letter,
  index,
  size = 34,
  className,
}: MemberAvatarProps) {
  const hue = (index * HUE_STEP) % 360

  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-[11px] font-display font-extrabold text-[var(--avatar-ink)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.41,
        background: `linear-gradient(140deg, hsl(${hue} 92% 88%), hsl(${hue} 88% 74%))`,
      }}
      aria-hidden
    >
      {letter}
    </div>
  )
}
