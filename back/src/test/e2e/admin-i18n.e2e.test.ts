// back/src/test/e2e/admin-i18n.e2e.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { SKILL_BRANCH_TEXT } from '../../main/domain/content/skills.definitions'
import { buildTestApp } from '../helpers/build-test-app'

type MissingEntry = {
  entity: string
  id: string
  field: string
  kind: 'empty' | 'identical'
  missingLocale: 'FR' | 'EN'
  value: string
}

describe('administration bilingue', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookie: string
  const suffix = Date.now()
  const email = `i18nadmin${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    // Aucun helper d'authentification admin n'existe dans ce dépôt : motif
    // repris de src/test/e2e/admin/admin-achievements.test.ts (lignes 17-25) —
    // inscription, passage en SUPER_ADMIN via Prisma, connexion.
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `i18nadmin${suffix}`, email, password: 'Password123!' },
    })
    await app.iocContainer.postgresOrm.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookie = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('crée un set avec ses deux langues', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: {
        nameFr: 'Bêtes légendaires',
        nameEn: 'Legendary beasts',
        descriptionFr: 'Les créatures les plus rares.',
        descriptionEn: 'The rarest creatures.',
      },
    })
    expect(res.statusCode).toBe(201)
  })

  it('refuse une création sans la langue anglaise', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: { nameFr: 'Sans anglais' },
    })
    expect(res.statusCode).toBe(400)
  })

  it("corrige une seule langue sans écraser l'autre lors d'une mise à jour partielle", async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: { nameFr: 'Titre original FR', nameEn: 'Original title EN' },
    })
    expect(created.statusCode).toBe(201)
    const setId = created.json().id as string

    const patched = await app.inject({
      method: 'PATCH',
      url: `/admin/sets/${setId}`,
      headers: { cookie },
      payload: { nameFr: 'Titre corrigé FR' },
    })
    expect(patched.statusCode).toBe(200)

    const row = await app.iocContainer.postgresOrm.prisma.cardSet.findUniqueOrThrow(
      { where: { id: setId } },
    )
    expect(row.nameFr).toBe('Titre corrigé FR')
    // L'anglais n'a PAS été envoyé dans le PATCH : il ne doit pas être écrasé
    // par `undefined`. C'est exactement la perte de données que l'ancien
    // pont d'écriture mono-langue évitait — cette assertion vérifie que sa
    // suppression (tâche 10) n'a pas réintroduit le problème.
    expect(row.nameEn).toBe('Original title EN')
  })

  it('liste les traductions manquantes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/translations/missing',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().entries)).toBe(true)
  })

  it("détecte un trou de traduction dans les deux sens, mais pas le contenu légitimement vide des deux côtés", async () => {
    const prisma = app.iocContainer.postgresOrm.prisma

    // L'API admin impose les deux langues à la création (voir plus haut) :
    // un déséquilibre ne peut naître que d'une donnée insérée hors API
    // (legacy, script) — d'où l'écriture directe en base ici, exactement le
    // scénario que la route sert à détecter après déploiement.
    const missingEnglish = await prisma.cardSet.create({
      data: { nameFr: `Sans anglais ${suffix}`, nameEn: '', isActive: false },
    })
    const missingFrench = await prisma.cardSet.create({
      data: { nameFr: '', nameEn: `Missing french ${suffix}`, isActive: false },
    })
    // Les deux langues sont pleines pour le nom ; la description, elle,
    // n'a jamais été renseignée ni en français ni en anglais — état normal
    // d'un champ facultatif, pas un trou de traduction.
    const legitimatelyEmpty = await prisma.cardSet.create({
      data: {
        nameFr: `Complet ${suffix}`,
        nameEn: `Complete ${suffix}`,
        isActive: false,
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/admin/translations/missing',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const entries = res.json().entries as MissingEntry[]

    const englishGap = entries.find(
      (e) => e.entity === 'cardSet' && e.id === missingEnglish.id,
    )
    expect(englishGap).toMatchObject({
      field: 'name',
      kind: 'empty',
      missingLocale: 'EN',
      value: `Sans anglais ${suffix}`,
    })

    const frenchGap = entries.find(
      (e) => e.entity === 'cardSet' && e.id === missingFrench.id,
    )
    expect(frenchGap).toMatchObject({
      field: 'name',
      kind: 'empty',
      missingLocale: 'FR',
      value: `Missing french ${suffix}`,
    })

    expect(entries.some((e) => e.id === legitimatelyEmpty.id)).toBe(false)
  })

  it("remonte une ligne dans l'état EXACT que la migration a produit : les deux colonnes identiques", async () => {
    const prisma = app.iocContainer.postgresOrm.prisma

    // Ce que `20260921151247_i18n_content_columns` a écrit sur toute la base :
    // `UPDATE "CardSet" SET "nameFr" = "name", "nameEn" = "name"`. Aucune
    // colonne n'est vide — c'est PRÉCISÉMENT ce que l'ancienne détection ne
    // voyait pas, d'où un écran affirmant « aucune traduction manquante » sur
    // une base où presque rien n'était traduit.
    const recopie = `Recopie de la migration ${suffix}`
    const postMigration = await prisma.cardSet.create({
      data: {
        nameFr: recopie,
        nameEn: recopie,
        descriptionFr: `Description recopiée ${suffix}`,
        descriptionEn: `Description recopiée ${suffix}`,
        isActive: false,
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/admin/translations/missing',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const entries = res.json().entries as MissingEntry[]

    const name = entries.find(
      (e) => e.id === postMigration.id && e.field === 'name',
    )
    expect(name).toMatchObject({
      entity: 'cardSet',
      kind: 'identical',
      missingLocale: 'EN',
      value: recopie,
    })

    // La colonne facultative recopiée remonte elle aussi : son `where`
    // nullable a sa propre clause d'égalité.
    const description = entries.find(
      (e) => e.id === postMigration.id && e.field === 'description',
    )
    expect(description).toMatchObject({
      entity: 'cardSet',
      kind: 'identical',
      value: `Description recopiée ${suffix}`,
    })
  })

  it('ne crie pas au loup sur une identité délibérée du contenu', async () => {
    const prisma = app.iocContainer.postgresOrm.prisma

    // « Flux » est le nom d'une branche de compétence, identique en français
    // et en anglais dans les définitions — et le test unitaire
    // `content-translations.test.ts` l'assume explicitement. Une ligne qui
    // porte cette valeur des deux côtés n'est pas une traduction oubliée.
    const legitimate = await prisma.cardSet.create({
      data: {
        nameFr: SKILL_BRANCH_TEXT.flux.nameFr,
        nameEn: SKILL_BRANCH_TEXT.flux.nameEn,
        isActive: false,
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/admin/translations/missing',
      headers: { cookie },
    })
    const entries = res.json().entries as MissingEntry[]

    expect(entries.some((e) => e.id === legitimate.id)).toBe(false)
  })
})
