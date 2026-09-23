import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../main/types/infra/config/config.service.interface'

/**
 * Applique des valeurs de `GlobalConfig` le temps d'une suite, et rend la
 * fonction qui remet celles d'avant.
 *
 * La table `GlobalConfig` est **partagée par tout le run e2e** : une suite qui
 * écrit dedans sans restaurer change le monde des suivantes, et l'ordre de
 * passage de Jest dépend de la taille des fichiers — donc il bascule dès qu'une
 * suite grossit. C'est ainsi que `raids/raid.test.ts`, en neutralisant
 * `raid.minMembers` et `raid.levelHpBonusPct`, faisait tomber
 * `economy-config.e2e.test.ts` une fois sur deux, sans rien changer à l'un ni à
 * l'autre.
 *
 * ```ts
 * let restoreConfig: () => Promise<void>
 * beforeAll(async () => {
 *   restoreConfig = await overrideConfig(configService, { 'raid.minMembers': 1 })
 * })
 * afterAll(async () => {
 *   await restoreConfig()
 *   await app.close()
 * })
 * ```
 *
 * Les valeurs sont relues avant écriture, jamais recopiées depuis `DEFAULTS` :
 * une suite qui tournerait après une autre ayant déjà modifié la clé doit
 * rendre ce qu'elle a trouvé, pas ce que le code livre par défaut.
 */
export async function overrideConfig(
  configService: ConfigServiceInterface,
  overrides: Partial<Record<ConfigKey, number>>,
): Promise<() => Promise<void>> {
  const keys = Object.keys(overrides) as ConfigKey[]
  const previous = new Map<ConfigKey, number>()

  for (const key of keys) {
    previous.set(key, await configService.get(key))
  }

  for (const key of keys) {
    const value = overrides[key]
    if (value !== undefined) {
      await configService.set(key, value)
    }
  }

  return async () => {
    for (const [key, value] of previous) {
      await configService.set(key, value)
    }
  }
}
