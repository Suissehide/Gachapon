import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { PLAY_TUTORIAL_STEPS } from '../../constants/tutorial.constant.ts'
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
