import { Link } from '@tanstack/react-router'
import { Coins, type LucideIcon, Sparkles, Ticket, Zap } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  open: boolean
  onClose: () => void
}

type TutorialStep = {
  title: string
  text: ReactNode
}

// Ressource inline : icône + mot dans la couleur canonique du site (mêmes
// paires icône/couleur que la page /guide et la topbar).
function Res({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon
  className: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-semibold',
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}

const RARITY_TEXT_CLASS = {
  common: 'text-rarity-common',
  legendary: 'text-rarity-legendary',
} as const

function Rarity({
  rarity,
  children,
}: {
  rarity: keyof typeof RARITY_TEXT_CLASS
  children: ReactNode
}) {
  return (
    <span className={cn('font-semibold', RARITY_TEXT_CLASS[rarity])}>
      {children}
    </span>
  )
}

const Jeton = ({ children }: { children: ReactNode }) => (
  <Res icon={Ticket} className="text-primary">
    {children}
  </Res>
)
const Poussiere = ({ children }: { children: ReactNode }) => (
  <Res icon={Sparkles} className="text-sky-400">
    {children}
  </Res>
)

const PLAY_TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Bienvenue sur Gachapon !',
    text: 'Tire des cartes, complète ta collection et fais combattre tes meilleures cartes dans la campagne.',
  },
  {
    title: 'Jetons & tirages',
    text: (
      <>
        Chaque tirage consomme un <Jeton>jeton</Jeton>. Tes jetons se régénèrent
        automatiquement avec le temps, jusqu'à un plafond. Tire une carte à la
        fois ou plusieurs d'un coup avec le tirage multiple.
      </>
    ),
  },
  {
    title: 'Raretés & garantie',
    text: (
      <>
        Cinq raretés, de <Rarity rarity="common">commune</Rarity> à{' '}
        <Rarity rarity="legendary">légendaire</Rarity>, et des variantes
        brillantes ou holographiques qui rapportent plus de{' '}
        <Poussiere>poussière</Poussiere>. La garantie (pitié) t'assure une{' '}
        <Rarity rarity="legendary">légendaire</Rarity> au bout d'un certain
        nombre de tirages.
      </>
    ),
  },
  {
    title: 'Doublons & poussière',
    text: (
      <>
        Un doublon est automatiquement converti en{' '}
        <Poussiere>poussière</Poussiere>. Cette monnaie sert à la boutique du
        jour, au Vœu et à l'amélioration de tes cartes : aucun tirage n'est
        jamais perdu.
      </>
    ),
  },
  {
    title: 'Boutique',
    text: (
      <>
        Dépense ta <Poussiere>poussière</Poussiere> dans la boutique du jour
        pour cibler des cartes précises, ou formule un Vœu pour la carte de tes
        rêves. La boutique propose aussi des packs de <Jeton>jetons</Jeton> et
        des recharges d'
        <Res icon={Zap} className="text-violet-600">
          énergie
        </Res>
        .
      </>
    ),
  },
  {
    title: 'Équipe & campagne',
    text: (
      <>
        Compose une équipe avec tes cartes et lance-toi dans la campagne : des
        combats qui rapportent de l'
        <Res icon={Coins} className="text-amber-400">
          or
        </Res>
        , de l'expérience et de l'équipement pour aller toujours plus loin.
      </>
    ),
  },
]

// Visite guidée en plusieurs étapes affichée à la première venue sur /play.
// Contrôlée par le parent : toute fermeture (Passer, X, overlay, dernière
// étape) passe par onClose, qui marque le tutoriel comme vu.
export function PlayTutorialPopup({ open, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0)

  // Repart de la première étape à chaque ouverture (bouton « ? » inclus)
  useEffect(() => {
    if (open) {
      setStepIndex(0)
    }
  }, [open])

  const step = PLAY_TUTORIAL_STEPS[stepIndex]
  const isLast = stepIndex === PLAY_TUTORIAL_STEPS.length - 1

  return (
    <Popup open={open} onOpenChange={(o) => !o && onClose()}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            subtitle={`Étape ${stepIndex + 1} sur ${PLAY_TUTORIAL_STEPS.length}`}
          >
            {step.title}
          </PopupTitle>
        </PopupHeader>
        <PopupBody>
          <p className="m-0 text-sm leading-relaxed text-text-light">
            {step.text}
          </p>
          {isLast && (
            <p className="mt-3 text-sm">
              <Link
                to="/guide"
                onClick={onClose}
                className="font-semibold text-primary hover:underline"
              >
                En savoir plus dans le guide complet →
              </Link>
            </p>
          )}
          <div className="mt-4 flex justify-center gap-1.5">
            {PLAY_TUTORIAL_STEPS.map((s, i) => (
              <span
                key={s.title}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === stepIndex ? 'bg-primary' : 'bg-border',
                )}
              />
            ))}
          </div>
        </PopupBody>
        <PopupFooter className="justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Passer
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Précédent
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={onClose}>
                C'est parti !
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStepIndex((i) => i + 1)}>
                Suivant
              </Button>
            )}
          </div>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
