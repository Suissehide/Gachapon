/**
 * Un run e2e doit rester séquentiel.
 *
 * `globalSetup` réserve UNE base Postgres et UN index Redis pour tout le run,
 * puis les pose dans `process.env`. Des workers parallèles en héritent tous :
 * ils écrivent alors dans la même base, en même temps, et on retombe sur la
 * panne que l'isolation par run avait justement supprimée — un « User not
 * found » juste après un login réussi, des collisions de contrainte unique, un
 * ensemble d'échecs différent à chaque passage, et des suites vertes dès qu'on
 * les lance seules.
 *
 * Le piège est qu'il n'y a AUCUN message : on lit des tests rouges et on
 * cherche la régression dans le code applicatif. Mieux vaut refuser de
 * démarrer.
 */
export function parallelRunError(maxWorkers: number): string | null {
  if (maxWorkers <= 1) {
    return null
  }
  return [
    `Les tests e2e ont démarré sur ${maxWorkers} workers, or un run e2e doit rester séquentiel.`,
    "Tout le run partage UNE base et UN index Redis, réservés par globalSetup : en parallèle, les suites s'écrasent l'une l'autre et les échecs n'ont aucun rapport avec le code testé.",
    'Utilise `npm run test:e2e` (ou ajoute `--maxWorkers=1`).',
  ].join('\n')
}
