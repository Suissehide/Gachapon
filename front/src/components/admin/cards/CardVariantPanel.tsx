import { useEffect, useState } from 'react'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { HOLO_ELIGIBLE_RARITIES } from '../../../constants/card.constant'
import { useAdminConfig, useAdminSaveConfig } from '../../../queries/useAdminConfig'

type VariantRates = {
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
}

const HOLO_FIELDS = [
  { key: 'holoRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'holoRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'holoRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
] satisfies { key: keyof VariantRates; label: string }[]

const BRILLIANT_FIELDS = [
  { key: 'brilliantRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'brilliantRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'brilliantRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
] satisfies { key: keyof VariantRates; label: string }[]

export function CardVariantPanel() {
  const { data, isLoading } = useAdminConfig()
  const saveConfig = useAdminSaveConfig()

  const [rates, setRates] = useState<VariantRates>({
    holoRateRare: 0, holoRateEpic: 0, holoRateLegendary: 0,
    brilliantRateRare: 0, brilliantRateEpic: 0, brilliantRateLegendary: 0,
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setRates({
        holoRateRare: data.holoRateRare ?? 0,
        holoRateEpic: data.holoRateEpic ?? 0,
        holoRateLegendary: data.holoRateLegendary ?? 0,
        brilliantRateRare: data.brilliantRateRare ?? 0,
        brilliantRateEpic: data.brilliantRateEpic ?? 0,
        brilliantRateLegendary: data.brilliantRateLegendary ?? 0,
      })
      setDirty(false)
    }
  }, [data])

  const handleChange = (key: keyof VariantRates, value: number) => {
    setRates((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
      {/* HOLOGRAPHIC section */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          🌈 Holographic
        </span>
        {HOLO_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.001}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-20 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden h-8 w-px bg-primary/20 sm:block" />

      {/* BRILLIANT section */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          ✨ Brilliant
        </span>
        {BRILLIANT_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.001}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-20 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>

      {/* Save — always rendered, disabled when clean */}
      <Button
        size="sm"
        onClick={() => saveConfig.mutate(rates)}
        disabled={!dirty || saveConfig.isPending}
      >
        Sauvegarder
      </Button>
    </div>
  )
}
