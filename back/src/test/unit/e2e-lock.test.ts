import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { acquireE2eLock, releaseE2eLock } from '../helpers/e2e-lock'

/**
 * Le verrou du run e2e. Il existe parce que `globalSetup` TRONQUE une base au
 * nom fixe : deux runs simultanes sur la meme machine — deux sessions d'agent,
 * ou un dev et un script — se vident la base l'un sous l'autre. La panne est
 * alors muette et deroutante (un « User not found » quelques millisecondes
 * apres un login reussi, des collisions de contrainte unique, un ensemble
 * d'echecs different a chaque fois).
 *
 * Le verrou ne rend pas les runs paralleles possibles : il transforme cette
 * corruption silencieuse en un refus immediat et lisible.
 */
describe('verrou du run e2e', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'e2e-lock-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('pose un verrou portant le PID du run', () => {
    acquireE2eLock(dir, 'gachapon_test', process.pid)
    const written = JSON.parse(
      readFileSync(join(dir, 'gachapon_test.lock'), 'utf8'),
    )
    expect(written.pid).toBe(process.pid)
  })

  it('refuse de demarrer si un run VIVANT tient deja la base', () => {
    acquireE2eLock(dir, 'gachapon_test', process.pid)
    expect(() => acquireE2eLock(dir, 'gachapon_test', process.pid + 1)).toThrow(
      /gachapon_test/,
    )
  })

  // Un run tue (Ctrl-C, OOM, `--forceExit` qui coupe le teardown) laisse son
  // verrou derriere lui. Sans cette reprise, la suite serait bloquee jusqu'a
  // une suppression manuelle — un remede pire que le mal.
  it("reprend un verrou perime dont le processus est mort", () => {
    const deadPid = 999_999_999
    writeFileSync(
      join(dir, 'gachapon_test.lock'),
      JSON.stringify({ pid: deadPid, startedAt: new Date().toISOString() }),
    )
    expect(() =>
      acquireE2eLock(dir, 'gachapon_test', process.pid),
    ).not.toThrow()
    const written = JSON.parse(
      readFileSync(join(dir, 'gachapon_test.lock'), 'utf8'),
    )
    expect(written.pid).toBe(process.pid)
  })

  // Deux bases differentes ne se genent pas : la cle du verrou, c'est la base.
  it('ne bloque pas un run sur une AUTRE base', () => {
    acquireE2eLock(dir, 'gachapon_test', process.pid)
    expect(() =>
      acquireE2eLock(dir, 'autre_base', process.pid + 1),
    ).not.toThrow()
  })

  it('libere le verrou, ce qui laisse le run suivant passer', () => {
    acquireE2eLock(dir, 'gachapon_test', process.pid)
    releaseE2eLock(dir, 'gachapon_test', process.pid)
    expect(() =>
      acquireE2eLock(dir, 'gachapon_test', process.pid + 1),
    ).not.toThrow()
  })

  // Le teardown d'un run qui s'est fait doubler ne doit pas emporter le
  // verrou de celui qui l'a repris.
  it("ne libere pas un verrou qui appartient a quelqu'un d'autre", () => {
    acquireE2eLock(dir, 'gachapon_test', process.pid)
    releaseE2eLock(dir, 'gachapon_test', process.pid + 1)
    expect(() => acquireE2eLock(dir, 'gachapon_test', process.pid + 2)).toThrow()
  })
})
