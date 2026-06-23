import { FastForward, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'

import { Button } from '../ui/button'
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

export function BattleControls({
  speed,
  onSpeedChange,
  onSkip,
  onReplay,
  isPaused,
  onTogglePause,
  isDone,
}: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onTogglePause}
        disabled={isDone}
      >
        {isPaused ? (
          <Play className="h-3.5 w-3.5" />
        ) : (
          <Pause className="h-3.5 w-3.5" />
        )}
        {isPaused ? 'Reprendre' : 'Pause'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={speed === 1 ? 'default' : 'outline'}
        onClick={() => onSpeedChange(1)}
        disabled={isDone}
      >
        ×1
      </Button>
      <Button
        type="button"
        size="sm"
        variant={speed === 2 ? 'default' : 'outline'}
        onClick={() => onSpeedChange(2)}
        disabled={isDone}
      >
        ×2
      </Button>
      <Button
        type="button"
        size="sm"
        variant={speed === 4 ? 'default' : 'outline'}
        onClick={() => onSpeedChange(4)}
        disabled={isDone}
      >
        <FastForward className="h-3.5 w-3.5" />
        ×4
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onSkip}
        disabled={isDone}
      >
        <SkipForward className="h-3.5 w-3.5" />
        Skip
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onReplay}>
        <RotateCcw className="h-3.5 w-3.5" />
        Replay
      </Button>
    </div>
  )
}
