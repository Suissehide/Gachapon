import type { LucideIcon } from 'lucide-react'
import { Coins, Gem, Layers, ShoppingBag, Sparkles, Swords } from 'lucide-react'

export type TutorialStep = {
  icon: LucideIcon
  title: string
  text: string
}

export const PLAY_TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur Gachapon !',
    text: "Tire des cartes, complète ta collection et fais combattre tes meilleures cartes dans la campagne. Cette petite visite guidée te présente l'essentiel — tu peux la passer à tout moment.",
  },
  {
    icon: Coins,
    title: 'Jetons & tirages',
    text: "Chaque tirage consomme un jeton. Tes jetons se régénèrent automatiquement avec le temps, jusqu'à un plafond. Tire une carte à la fois ou plusieurs d'un coup avec le tirage multiple.",
  },
  {
    icon: Gem,
    title: 'Raretés & garantie',
    text: "Cinq raretés, de Common à Legendary, et des variantes Brillant ou Holographique qui rapportent plus de poussière. La garantie (pitié) t'assure une Legendary au bout d'un certain nombre de tirages.",
  },
  {
    icon: Layers,
    title: 'Doublons & poussière',
    text: "Un doublon est automatiquement converti en poussière. Cette monnaie sert à la boutique du jour, au Vœu et à l'amélioration de tes cartes — aucun tirage n'est jamais perdu.",
  },
  {
    icon: ShoppingBag,
    title: 'Boutique',
    text: "Dépense ta poussière dans la boutique du jour pour cibler des cartes précises, ou formule un Vœu pour la carte de tes rêves. La boutique propose aussi des packs de jetons et des recharges d'énergie.",
  },
  {
    icon: Swords,
    title: 'Équipe & campagne',
    text: "Compose une équipe avec tes cartes et lance-toi dans la campagne : des combats qui rapportent de l'or, de l'expérience et de l'équipement pour aller toujours plus loin.",
  },
]
