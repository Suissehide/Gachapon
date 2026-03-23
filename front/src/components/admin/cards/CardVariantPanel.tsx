import { useAppForm } from '../../../hooks/formConfig'
import {
  useAdminConfig,
  useAdminSaveConfig,
} from '../../../queries/useAdminConfig'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'

type VariantRates = {
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
  variantMultiplierHolo: number
  variantMultiplierBrilliant: number
}

const HOLO_FIELDS = [
  { key: 'holoRateRare' as const, label: 'Rare', dot: 'bg-violet-400' },
  { key: 'holoRateEpic' as const, label: 'Epic', dot: 'bg-pink-400' },
  {
    key: 'holoRateLegendary' as const,
    label: 'Legendary',
    dot: 'bg-amber-400',
  },
] satisfies { key: keyof VariantRates; label: string; dot: string }[]

const BRILLIANT_FIELDS = [
  { key: 'brilliantRateRare' as const, label: 'Rare', dot: 'bg-violet-400' },
  { key: 'brilliantRateEpic' as const, label: 'Epic', dot: 'bg-pink-400' },
  {
    key: 'brilliantRateLegendary' as const,
    label: 'Legendary',
    dot: 'bg-amber-400',
  },
] satisfies { key: keyof VariantRates; label: string; dot: string }[]

export function CardVariantPanel() {
  const { data } = useAdminConfig()
  const saveConfig = useAdminSaveConfig()

  if (!data) {
    return null
  }

  const initialRates: VariantRates = {
    holoRateRare: data.holoRateRare ?? 0,
    holoRateEpic: data.holoRateEpic ?? 0,
    holoRateLegendary: data.holoRateLegendary ?? 0,
    brilliantRateRare: data.brilliantRateRare ?? 0,
    brilliantRateEpic: data.brilliantRateEpic ?? 0,
    brilliantRateLegendary: data.brilliantRateLegendary ?? 0,
    variantMultiplierHolo: data.variantMultiplierHolo ?? 2,
    variantMultiplierBrilliant: data.variantMultiplierBrilliant ?? 3,
  }

  // key ensures the form remounts with fresh defaultValues after a save + refetch
  return (
    <CardVariantForm
      key={JSON.stringify(initialRates)}
      initialRates={initialRates}
      saveConfig={saveConfig}
    />
  )
}

function CardVariantForm({
  initialRates,
  saveConfig,
}: {
  initialRates: VariantRates
  saveConfig: ReturnType<typeof useAdminSaveConfig>
}) {
  const form = useAppForm({
    defaultValues: initialRates,
    onSubmit: async ({ value }) => {
      await saveConfig.mutateAsync(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="rounded-xl border border-border bg-card px-5 py-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
          Taux de variants
        </p>
        <form.Subscribe
          selector={(s) => ({
            isDirty: s.isDirty,
            isSubmitting: s.isSubmitting,
          })}
        >
          {({ isDirty, isSubmitting }) => (
            <Button type="submit" size="sm" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Sauvegarder'}
            </Button>
          )}
        </form.Subscribe>
      </div>

      {/* Rate rows */}
      <div className="flex flex-col gap-2">
        {/* Holographic */}
        <div className="flex items-center gap-6">
          <span className="w-32 shrink-0 text-xs font-semibold text-primary">
            🌈 Holographic
          </span>
          <div className="flex items-center gap-8">
            {HOLO_FIELDS.map(({ key, label, dot }) => (
              <form.AppField key={key} name={key}>
                {(field) => (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                    />
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      max={100}
                      step={0.001}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      onBlur={field.handleBlur}
                      className="h-8 w-20 text-center tabular-nums"
                    />
                    <span className="text-xs text-text-light">%</span>
                  </div>
                )}
              </form.AppField>
            ))}
          </div>
        </div>

        {/* Brilliant */}
        <div className="flex items-center gap-6">
          <span className="w-32 shrink-0 text-xs font-semibold text-amber-400">
            ✨ Brilliant
          </span>
          <div className="flex items-center gap-8">
            {BRILLIANT_FIELDS.map(({ key, label, dot }) => (
              <form.AppField key={key} name={key}>
                {(field) => (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                    />
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      max={100}
                      step={0.001}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      onBlur={field.handleBlur}
                      className="h-8 w-20 text-center tabular-nums"
                    />
                    <span className="text-xs text-text-light">%</span>
                  </div>
                )}
              </form.AppField>
            ))}
          </div>
        </div>

        {/* Recyclage multipliers */}
        <div className="flex items-center gap-6">
          <span className="w-32 shrink-0 text-xs font-semibold text-text-light">
            Recyclage ×
          </span>
          <div className="flex items-center gap-8">
            {([
              { key: 'variantMultiplierHolo' as const, label: '🌈 Holo' },
              { key: 'variantMultiplierBrilliant' as const, label: '✨ Brillant' },
            ] satisfies { key: keyof VariantRates; label: string }[]).map(({ key, label }) => (
              <form.AppField key={key} name={key}>
                {(field) => (
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor={key} className="text-xs">{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min={1}
                      step={0.1}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                      className="h-8 w-20 text-center tabular-nums"
                    />
                    <span className="text-xs text-text-light">×</span>
                  </div>
                )}
              </form.AppField>
            ))}
          </div>
        </div>
      </div>
    </form>
  )
}
