import type http from 'node:http'
import type { FastifyInstance } from 'fastify'

export interface HttpServer {
  readonly baseUrl: string | undefined
  /**
   * L'instance configuree. Exposee parce que les suites e2e injectent leurs
   * requetes dedans (`app.inject()`) sans ouvrir de port — sans cet acces,
   * `build-test-app.ts` devait atteindre le champ prive par un `as any` et
   * rendait un `any`, ce qui privait de typage les 87 suites.
   */
  readonly instance: FastifyInstance
  configure: () => Promise<void>
  start: () => Promise<void>
  stop: () => Promise<void>
  getServer: () => http.Server
}
