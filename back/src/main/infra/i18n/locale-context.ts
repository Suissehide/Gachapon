import { AsyncLocalStorage } from 'node:async_hooks'

import { DEFAULT_LOCALE, type Locale } from './locale'

const storage = new AsyncLocalStorage<Locale>()

export function runWithLocale<T>(locale: Locale, fn: () => T): T {
  return storage.run(locale, fn)
}

/**
 * Variante pour les hooks Fastify : un hook `onRequest` rend la main avant
 * que le handler ne s'exécute, il ne peut donc pas envelopper la suite dans
 * `storage.run()`. `enterWith` pose la locale sur le contexte asynchrone
 * courant, qui est celui de la requête.
 */
export function enterLocale(locale: Locale): void {
  storage.enterWith(locale)
}

/**
 * Lue au moment où un champ calculé est consulté, pas au moment de la
 * requête SQL. Hors contexte — tâches de fond, scripts — on retombe sur la
 * locale par défaut plutôt que de jeter : un mail de relance ne doit pas
 * échouer faute de requête HTTP.
 */
export function getCurrentLocale(): Locale {
  return storage.getStore() ?? DEFAULT_LOCALE
}
