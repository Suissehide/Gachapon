import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type LockFile = { pid: number; startedAt: string; cwd: string }

function lockPath(dir: string, dbName: string): string {
  return join(dir, `${dbName}.lock`)
}

/** `kill(pid, 0)` ne tue rien : il demande si le processus existe encore. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = le processus existe mais appartient a quelqu'un d'autre.
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function read(path: string): LockFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as LockFile).pid === 'number'
    ) {
      return parsed as LockFile
    }
    return null
  } catch {
    // Illisible ou tronque — un run tue en pleine ecriture. On le traite
    // comme absent plutot que de bloquer la suite sur un fichier corrompu.
    return null
  }
}

/**
 * Prend le verrou du run e2e sur `dbName`, ou leve si un run VIVANT le tient.
 *
 * Il existe parce que `globalSetup` TRONQUE une base au nom fixe : deux runs
 * simultanes sur la meme machine — deux sessions d'agent, ou un dev et un
 * script — se vident la base l'un sous l'autre. La panne est alors muette et
 * deroutante : un « User not found » quelques millisecondes apres un login
 * reussi, des collisions de contrainte unique sur les fixtures, et un ensemble
 * d'echecs different a chaque fois. Le verrou ne rend pas les runs paralleles
 * possibles ; il remplace cette corruption silencieuse par un refus lisible.
 *
 * Un verrou dont le processus est mort est repris sans ceremonie : un run tue
 * (Ctrl-C, OOM, `--forceExit` qui coupe le teardown) laisse le sien derriere
 * lui, et bloquer la suite jusqu'a une suppression manuelle serait un remede
 * pire que le mal.
 */
export function acquireE2eLock(dir: string, dbName: string, pid: number): void {
  mkdirSync(dir, { recursive: true })
  const path = lockPath(dir, dbName)
  const held = existsSync(path) ? read(path) : null

  if (held !== null && held.pid !== pid && isAlive(held.pid)) {
    throw new Error(
      `Un autre run e2e utilise deja la base « ${dbName} » ` +
        `(PID ${held.pid}, demarre a ${held.startedAt}, depuis ${held.cwd}).\n` +
        `Les deux runs se videraient la base l'un sous l'autre : ` +
        `globalSetup TRONQUE la base au demarrage.\n` +
        `Attends la fin de l'autre run, ou pointe DATABASE_URL de .env.test ` +
        `vers une autre base.\n` +
        `Si ce PID n'existe plus, supprime ${path}.`,
    )
  }

  const lock: LockFile = {
    pid,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  }
  writeFileSync(path, JSON.stringify(lock), 'utf8')
}

/**
 * Rend le verrou — et seulement s'il nous appartient encore. Un run double par
 * une reprise de verrou perime ne doit pas emporter celui de son successeur en
 * partant.
 */
export function releaseE2eLock(
  dir: string,
  dbName: string,
  pid: number,
): void {
  const path = lockPath(dir, dbName)
  const held = existsSync(path) ? read(path) : null
  if (held?.pid === pid) {
    rmSync(path, { force: true })
  }
}

/** Le nom de base porte par une URL Postgres, cle du verrou. */
export function databaseNameFromUrl(connectionString: string): string {
  const path = new URL(connectionString).pathname.replace(/^\//, '')
  return path === '' ? 'unknown' : path
}
