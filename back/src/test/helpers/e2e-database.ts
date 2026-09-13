/**
 * La base Postgres propre a un run e2e.
 *
 * `globalSetup` tronquait une base au nom fixe : deux runs simultanes sur la
 * meme machine — deux sessions d'agent dans le meme worktree, ou un dev et un
 * script — se vidaient la base l'un sous l'autre, avec une panne muette et
 * deroutante a la cle (un « User not found » quelques millisecondes apres un
 * login reussi, des collisions de contrainte unique, un ensemble d'echecs
 * different a chaque run).
 *
 * Isoler vaut mieux que serialiser : un verrou aurait fait attendre les runs,
 * ici ils sont reellement paralleles. Une base neuve coute ~1,4 s de
 * migrations, contre plusieurs minutes d'attente.
 */

/** `gachapon_test` + le PID du run, pour pouvoir reclamer la base plus tard. */
export function runDatabaseName(baseName: string, pid: number): string {
  return `${baseName}_run_${pid}`
}

/** La meme URL, pointee sur une autre base. */
export function withDatabase(connectionString: string, dbName: string): string {
  const url = new URL(connectionString)
  url.pathname = `/${dbName}`
  return url.toString()
}

/**
 * `CREATE DATABASE` et `DROP DATABASE` ne s'executent pas depuis la base
 * concernee : il faut une connexion ailleurs. `postgres` existe toujours.
 */
export function maintenanceUrl(connectionString: string): string {
  return withDatabase(connectionString, 'postgres')
}

/**
 * Les bases de run dont le processus est mort.
 *
 * Un run tue (Ctrl-C, OOM, `--forceExit` qui coupe le teardown) ne supprime
 * pas la sienne. Sans ce ramassage elles s'accumuleraient a chaque incident ;
 * avec lui, le prochain run fait le menage au passage.
 */
export function staleRunDatabases(
  databaseNames: string[],
  baseName: string,
  isAlive: (pid: number) => boolean,
): string[] {
  const prefix = `${baseName}_run_`
  return databaseNames.filter((name) => {
    if (!name.startsWith(prefix)) {
      return false
    }
    const pid = Number(name.slice(prefix.length))
    return Number.isInteger(pid) && pid > 0 && !isAlive(pid)
  })
}

/** `kill(pid, 0)` ne tue rien : il demande si le processus existe encore. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = le processus existe, mais appartient a quelqu'un d'autre.
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}
