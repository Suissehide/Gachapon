// TeamEmblem — carré-emblème d'équipe, dégradé teinté par la `hue` envoyée
// par le serveur. Valeurs reprises de `docs/design_handoff_equipe/equipe.css`
// (`.tm-emblem--flat`) : dégradé `hsl(H 95% 82%) → hsl(H 85% 58%)` à 140deg,
// radius 24 %, liseré interne blanc translucide, lettre à 46 % du côté.
//
// Construit comme un conteneur qui porte le fond (dégradé aujourd'hui, image
// uploadée demain) plutôt que comme une lettre décorée : la géométrie
// (taille, radius, liseré) n'a pas à changer le jour où `imageUrl` apparaît,
// il suffira de remplacer le `background` par une `background-image`.
import { cn } from '../../libs/utils.ts'

type TeamEmblemProps = {
  /** Teinte (0-360) pilotant le dégradé — envoyée par le serveur. */
  hue: number
  /** Lettre affichée au centre (généralement la première du nom d'équipe). */
  letter: string
  /** Côté du carré en pixels. */
  size?: number
  className?: string
}

export function TeamEmblem({
  hue,
  letter,
  size = 76,
  className,
}: TeamEmblemProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-[24%] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, hsl(${hue} 95% 82%), hsl(${hue} 85% 58%))`,
      }}
    >
      <span
        className="select-none font-display font-extrabold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.25)]"
        style={{ fontSize: size * 0.46 }}
      >
        {letter}
      </span>
    </div>
  )
}
