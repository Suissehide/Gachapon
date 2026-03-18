import { useEffect, useState } from 'react'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { HOLO_ELIGIBLE_RARITIES } from '../../../constants/card.constant'
import { useAdminConfig, useAdminSaveConfig } from '../../../queries/useAdminConfig'

type HoloRates = {
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
}

// Chaque entrée correspond à une rareté de HOLO_ELIGIBLE_RARITIES
const RATE_FIELDS = [
  { key: 'holoRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'holoRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'holoRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
] satisfies { key: keyof HoloRates; label: string }[]

export function HoloConfigPanel() {
  const { data, isLoading } = useAdminConfig()
  const saveConfig = useAdminSaveConfig()

  const [rates, setRates] = useState<HoloRates>({
    holoRateRare: 0,
    holoRateEpic: 0,
    holoRateLegendary: 0,
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setRates({
        holoRateRare: data.holoRateRare ?? 0,
        holoRateEpic: data.holoRateEpic ?? 0,
        holoRateLegendary: data.holoRateLegendary ?? 0,
      })
      setDirty(false)
    }
  }, [data])

  const handleChange = (key: keyof HoloRates, value: number) => {
    setRates((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="flex items-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
        ✨ Holo drop rates
      </span>
      <div className="flex items-center gap-4">
        {RATE_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-16 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>
      {dirty && (
        <Button
          size="sm"
          onClick={() => saveConfig.mutate(rates)}
          disabled={saveConfig.isPending}
        >
          Sauvegarder
        </Button>
      )}
    </div>
  )
}
