// listRowVariants — la carte-ligne des listes de la fiche d'équipe : ligne
// de membre, ligne de duel, ligne de pari. Reprend `.tm-mem` du handoff
// (`docs/design_handoff_equipe/equipe.css`) :
//
//   `.tm-mem`       { padding: 12px 18px; border-radius: 14px;
//                     background: #fff; border: 1px solid rgba(27,23,38,.06) }
//   `.tm-mem:hover` { border-color: rgba(27,23,38,.14);
//                     transform: translateY(-1px) }
//   `.tm-mem--you`  { background: linear-gradient(135deg,#fff7ed,#fffdf9);
//                     border-color: #fcd34d }
//
// Exporté en fonction de classes plutôt qu'en composant, comme
// `buttonVariants` et `inputVariants` : les consommateurs rendent tantôt un
// `<li>`, tantôt un `<div>`, et posent leur propre grille ou leur propre
// flex par-dessus. Un composant à balise fixe les aurait forcés à
// s'envelopper.
import { cva } from 'class-variance-authority'

export const listRowVariants = cva(
  'rounded-[14px] border p-[12px_18px] transition-[border-color,transform] duration-200 hover:-translate-y-px',
  {
    variants: {
      tone: {
        /** Ligne ordinaire : carte blanche, liseré ténu. */
        default: 'border-foreground/6 bg-card hover:border-foreground/14',
        /**
         * La ligne qui me concerne (`.tm-mem--you`) : dégradé ambré très
         * clair et liseré ambré. Rendu en opacités de `--primary` plutôt
         * qu'en hexadécimaux, comme le reste de l'écran.
         */
        mine: 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/[0.02] hover:border-primary/60',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)
