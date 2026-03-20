export const CONFIG_KEYS = [
  'tokenRegenIntervalMinutes',
  'tokenMaxStock',
  'pityThreshold',
  'dustCommon',
  'dustUncommon',
  'dustRare',
  'dustEpic',
  'dustLegendary',
  'holoRateRare',
  'holoRateEpic',
  'holoRateLegendary',
  'brilliantRateRare',
  'brilliantRateEpic',
  'brilliantRateLegendary',
] as const

export type ConfigKey = (typeof CONFIG_KEYS)[number]

export interface ConfigServiceInterface {
  get(key: ConfigKey): Promise<number>
  getMany<K extends ConfigKey>(...keys: K[]): Promise<Record<K, number>>
  set(key: ConfigKey, value: number): Promise<void>
  bootstrap(): Promise<void>
}
