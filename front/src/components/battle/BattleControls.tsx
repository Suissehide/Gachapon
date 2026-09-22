import { FastForward, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import type { SceneSpeed } from './types'

type Props = {
  speed: SceneSpeed
  onSpeedChange: (s: SceneSpeed) => void
  onSkip: () => void
  onReplay: () => void
  isPaused: boolean
  onTogglePause: () => void
  isDone: boolean
}

const SPEED_OPTIONS: {
  value: '1' | '2' | '4'
  label: string
  icon: React.ReactNode
}[] = [
  { value: '1', label: '×1', icon: null },
  { value: '2', label: '×2', icon: <FastForward className="h-3 w-3" /> },
  { value: '4', label: '×4', icon: <FastForward className="h-3 w-3" /> },
]

export function BattleControls({
  speed,
  onSpeedChange,
  onSkip,
  onReplay,
  isPaused,
  onTogglePause,
  isDone,
}: Props) {
  const { t } = useTranslation('combat')
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
      <Button
        type="button"
        onClick={onTogglePause}
        disabled={isDone}
        size="default"
      >
        {isDone ? (
          <>
            <Play className="h-4 w-4" /> {t('combat:controls.done')}
          </>
        ) : isPaused ? (
          <>
            <Play className="h-4 w-4" /> {t('combat:controls.resume')}
          </>
        ) : (
          <>
            <Pause className="h-4 w-4" /> {t('combat:controls.pause')}
          </>
        )}
      </Button>

      <SegmentedControl
        options={SPEED_OPTIONS}
        value={String(speed) as '1' | '2' | '4'}
        onChange={(v) => onSpeedChange(Number(v) as SceneSpeed)}
      />

      <Button
        type="button"
        variant="outline"
        onClick={onSkip}
        disabled={isDone}
        size="default"
      >
        <SkipForward className="h-4 w-4" /> {t('combat:controls.skip')}
      </Button>

      <Button type="button" variant="outline" onClick={onReplay} size="default">
        <RotateCcw className="h-4 w-4" /> {t('combat:battle.replay')}
      </Button>
    </div>
  )
}
