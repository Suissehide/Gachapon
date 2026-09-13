/**
 * Le budget de temps des suites e2e, HOOKS COMPRIS.
 *
 * `testTimeout` dans la config ne couvre que les tests : les `beforeAll` et
 * `afterAll` restent a 5 s, ce qui est trop court quand le premier demarre un
 * Fastify complet avec Prisma et Redis, et que le second les referme — la
 * fermeture prend a elle seule ~5 s aujourd'hui (un temporisateur dans le
 * chemin de close, a chercher). Un « lent » se declarait alors « casse », de
 * facon intermittente selon la charge de la machine.
 *
 * `jest.setTimeout` ici s'applique aux deux. 20 s reste loin de tout blocage
 * reel, qui continuera de se voir.
 */
jest.setTimeout(20_000)
