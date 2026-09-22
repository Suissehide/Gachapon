import { Link } from '@tanstack/react-router'
import { Coins, type LucideIcon, Sparkles, Ticket, Zap } from 'lucide-react'
import { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

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
  /** Suffixe de clé sous `gacha:tutorial.steps.*`. */
  id: string
  /** Marqueurs `<Trans>` de l'étape, nommés — jamais d'index positionnel. */
  components?: Record<string, ReactElement>
}

// Ressource inline : icône + mot dans la couleur canonique du site (mêmes
// paires icône/couleur que la page /guide et la topbar).
// `children` est optionnel : quand l'élément est passé à `<Trans>` via
// `components`, c'est la chaîne traduite qui fournit le texte de la balise —
// TypeScript ne peut pas le savoir (même correctif que `Pill`, tâche 7b).
function Res({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon
  className: string
  children?: ReactNode
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
  children?: ReactNode
}) {
  return (
    <span className={cn('font-semibold', RARITY_TEXT_CLASS[rarity])}>
      {children}
    </span>
  )
}

const Jeton = ({ children }: { children?: ReactNode }) => (
  <Res icon={Ticket} className="text-primary">
    {children}
  </Res>
)
const Poussiere = ({ children }: { children?: ReactNode }) => (
  <Res icon={Sparkles} className="text-sky-400">
    {children}
  </Res>
)

const PLAY_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'welcome' },
  { id: 'tokens', components: { token: <Jeton /> } },
  {
    id: 'rarities',
    components: {
      common: <Rarity rarity="common" />,
      legendary1: <Rarity rarity="legendary" />,
      legendary2: <Rarity rarity="legendary" />,
      dust: <Poussiere />,
    },
  },
  { id: 'duplicates', components: { dust: <Poussiere /> } },
  {
    id: 'shop',
    components: {
      dust: <Poussiere />,
      token: <Jeton />,
      energy: <Res icon={Zap} className="text-violet-600" />,
    },
  },
  {
    id: 'campaign',
    components: { gold: <Res icon={Coins} className="text-amber-400" /> },
  },
]

// Visite guidée en plusieurs étapes affichée à la première venue sur /play.
// Contrôlée par le parent : toute fermeture (Passer, X, overlay, dernière
// étape) passe par onClose, qui marque le tutoriel comme vu.
export function PlayTutorialPopup({ open, onClose }: Props) {
  const { t } = useTranslation('gacha')
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
            subtitle={t('gacha:tutorial.stepCounter', {
              current: stepIndex + 1,
              total: PLAY_TUTORIAL_STEPS.length,
            })}
          >
            {t(`gacha:tutorial.steps.${step.id}.title`)}
          </PopupTitle>
        </PopupHeader>
        <PopupBody>
          <p className="m-0 text-sm leading-relaxed text-text-light">
            <Trans
              t={t}
              i18nKey={`gacha:tutorial.steps.${step.id}.text`}
              components={step.components}
            />
          </p>
          {isLast && (
            <p className="mt-3 text-sm">
              <Link
                to="/guide"
                onClick={onClose}
                className="font-semibold text-primary hover:underline"
              >
                {t('gacha:tutorial.guideLink')}
              </Link>
            </p>
          )}
          <div className="mt-4 flex justify-center gap-1.5">
            {PLAY_TUTORIAL_STEPS.map((s, i) => (
              <span
                key={s.id}
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
            {t('gacha:tutorial.skip')}
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                {t('gacha:tutorial.previous')}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={onClose}>
                {t('gacha:tutorial.start')}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStepIndex((i) => i + 1)}>
                {t('gacha:tutorial.next')}
              </Button>
            )}
          </div>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
