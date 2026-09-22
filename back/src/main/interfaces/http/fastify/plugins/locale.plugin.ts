import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

import {
  parseLocale,
  resolveLocaleFromHeader,
} from '../../../../infra/i18n/locale'
import { enterLocale } from '../../../../infra/i18n/locale-context'

/**
 * Ouvre le contexte de locale de la requête (tâche 2, `enterLocale`) avant
 * que quoi que ce soit ne lise du contenu localisé — voir la note de tâche 3
 * sur la mémorisation des champs calculés de `localized.extension.ts`.
 *
 * Ordre de résolution : `?lang=` valide, sinon `Accept-Language`, sinon
 * `EN`. `User.locale` ne participe pas : ce hook `onRequest` d'instance
 * s'exécute avant `verifySessionCookie`, `request.user` n'existe donc pas
 * encore (voir task-4-brief.md).
 */
const localePlugin: FastifyPluginAsync = fastifyPlugin(
  (fastify: FastifyInstance) => {
    fastify.log.trace('Registering locale plugin')

    fastify.addHook('onRequest', (request) => {
      // `request.query` n'est pas fiable au type : le parseur de
      // querystring de Fastify renvoie un tableau pour un paramètre répété
      // (`?lang=fr&lang=en` → `{ lang: ['fr', 'en'] }`). Une simple
      // assertion `as { lang?: string }` laissait passer ce tableau
      // jusqu'à `parseLocale`, qui plantait sur `value.trim`. Un `lang`
      // répété doit être traité comme absent — pas rejeté, pas résolu
      // arbitrairement — donc on ne le retient que s'il s'agit bien d'une
      // string.
      const query = request.query as Record<string, unknown> | undefined
      const rawLang = query?.lang
      const explicit = parseLocale(
        typeof rawLang === 'string' ? rawLang : undefined,
      )
      const locale =
        explicit ?? resolveLocaleFromHeader(request.headers['accept-language'])
      enterLocale(locale)
      return Promise.resolve()
    })

    fastify.log.debug('Locale plugin successfully registered')
    return Promise.resolve()
  },
)

export { localePlugin }
