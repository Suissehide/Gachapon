// TeamEmblem — carré-emblème d'équipe. Le handoff en spécifie deux variantes
// (`docs/design_handoff_equipe/equipe.css`) :
//   - `.tm-emblem--flat`, pilotée par une teinte serveur (carte « liste des
//     équipes ») : dégradé `hsl(H 95% 82%) → hsl(H 85% 58%)` à 140deg.
//   - `.tm-emblem`, le dégradé « héros » fixe à 3 arrêts (carte d'identité,
//     où aucune hue n'est passée au helper d'origine) : `--amber-soft →
//     --primary 45 % → --secondary`.
// `hue` absent = dégradé héros ; `hue` présent = dégradé teinté, exactement
// comme le helper du handoff choisit entre les deux. Radius 24 %, liseré
// interne blanc translucide, lettre à 46 % du côté : identiques aux deux.
//
// Construit comme un conteneur qui porte le fond (dégradé aujourd'hui, image
// uploadée demain) plutôt que comme une lettre décorée : la géométrie
// (taille, radius, liseré) n'a pas à changer le jour où `imageUrl` apparaît,
// il suffira de remplacer le `background` par une `background-image`.
import { cn } from '../../libs/utils.ts'

type TeamEmblemProps = {
  /**
   * Teinte (0-360) pilotant le dégradé — envoyée par le serveur. Omise :
   * l'emblème prend le dégradé « héros » fixe à 3 arrêts de la carte
   * d'identité plutôt que le dégradé teinté de la carte liste.
   */
  hue?: number
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
  const background =
    hue === undefined
      ? 'linear-gradient(140deg, var(--amber-soft), var(--primary) 45%, var(--secondary))'
      : `linear-gradient(140deg, hsl(${hue} 95% 82%), hsl(${hue} 85% 58%))`

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-[24%] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        background,
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
