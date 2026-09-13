import { describe, expect, it } from '@jest/globals'

import { BackgroundTasks } from '../../main/application/background-tasks'

const tick = () => new Promise((r) => setTimeout(r, 0))

/**
 * Le registre des taches de fond.
 *
 * Trois routes repondent au joueur SANS attendre le credit de points
 * d'equipe (`void teamProgressionDomain.award(...)`), et c'est voulu : un
 * reglement de points en echec ne doit pas transformer une attaque ou un duel
 * reussi en erreur. Mais `award` ouvre une transaction Serializable, et rien
 * ne l'attendait a l'arret : un SIGTERM en pleine attaque perdait les points,
 * et `$disconnect` restait suspendu jusqu'au delai de 5 s de la transaction
 * abandonnee.
 */
describe('registre des taches de fond', () => {
  it('attend une tache en vol', async () => {
    const tasks = new BackgroundTasks()
    let done = false
    tasks.track(tick().then(() => tick()).then(() => {
      done = true
    }))
    await tasks.drain()
    expect(done).toBe(true)
  })

  // Le `.catch()` des appelants journalise deja ; le drain ne doit surtout pas
  // faire echouer une fermeture parce qu'une tache de fond a rate.
  it("n'echoue pas quand une tache rejette", async () => {
    const tasks = new BackgroundTasks()
    tasks.track(Promise.reject(new Error('boom')))
    await expect(tasks.drain()).resolves.toBeUndefined()
  })

  it('oublie les taches terminees, pour ne pas fuir en memoire', async () => {
    const tasks = new BackgroundTasks()
    tasks.track(tick())
    await tasks.drain()
    expect(tasks.pending()).toBe(0)
  })

  // Une tache peut en engendrer une autre — `award` credite plusieurs equipes.
  it('attend aussi les taches nees PENDANT le drain', async () => {
    const tasks = new BackgroundTasks()
    let deep = false
    tasks.track(
      tick().then(() => {
        tasks.track(
          tick().then(() => {
            deep = true
          }),
        )
      }),
    )
    await tasks.drain()
    expect(deep).toBe(true)
  })

  // Mieux vaut une fermeture qui aboutit qu'une fermeture qui pend : c'est
  // exactement le defaut qu'on corrige.
  it('rend la main au bout du delai, meme si une tache ne finit jamais', async () => {
    const tasks = new BackgroundTasks()
    tasks.track(new Promise(() => {}))
    const started = Date.now()
    await tasks.drain(30)
    expect(Date.now() - started).toBeLessThan(2000)
  })
})
