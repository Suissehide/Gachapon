import { describe, expect, it } from '@jest/globals'

import {
  defaultLocaleName,
  readNameInBothLocales,
} from '../../main/infra/i18n/localized-broadcast'

/**
 * `readNameInBothLocales` a une branche que le test e2e
 * (`i18n-broadcast.e2e.test.ts`) n'exerce jamais : ses colonnes de test sont
 * toujours pleines. Ce fichier couvre le repli, et documente pourquoi il
 * reste un repli SILENCIEUX plutôt qu'un signal explicite.
 *
 * Repli délibéré, tranché en revue de la tâche 12 : `Card.nameFr`/`nameEn`
 * et `CardSet.nameFr`/`nameEn` sont `NOT NULL` en base, donc ce chemin est
 * mort en pratique — mais s'il se produisait, diffuser une chaîne vide sous
 * `cardNameEn` violerait la règle globale « jamais de chaîne vide » et
 * casserait l'affichage du flux live côté client, ce qui est pire qu'un nom
 * dans la mauvaise langue sous cette clé.
 *
 * Objection notée et assumée : sur une frontière qui étiquette explicitement
 * deux valeurs pour deux publics, ce repli fait mentir le nom du champ — un
 * client anglophone peut recevoir du français sous `cardNameEn`, sans
 * aucun indice que c'est un repli. Ce n'est pas une évidence, c'est un
 * compromis : dispo (une chaîne dans la mauvaise langue) plutôt que vide.
 */
describe('readNameInBothLocales', () => {
  it('rend les deux colonnes telles quelles quand elles sont pleines', () => {
    const result = readNameInBothLocales({
      nameFr: 'Créature des profondeurs',
      nameEn: 'Deep-sea creature',
    })

    expect(result).toEqual({
      fr: 'Créature des profondeurs',
      en: 'Deep-sea creature',
    })
    expect(result.fr).not.toBe(result.en)
  })

  it('replie sur le français quand nameEn est vide', () => {
    const result = readNameInBothLocales({
      nameFr: 'Créature des profondeurs',
      nameEn: '',
    })

    expect(result).toEqual({
      fr: 'Créature des profondeurs',
      en: 'Créature des profondeurs',
    })
  })

  // Branche symétrique de la précédente — aucun autre test du lot ne
  // l'exerce (le repli de `pick()` dans `localized.extension.ts` n'a lui
  // non plus de test dédié à ce sens).
  it('replie sur l\'anglais quand nameFr est vide', () => {
    const result = readNameInBothLocales({
      nameFr: '',
      nameEn: 'Deep-sea creature',
    })

    expect(result).toEqual({
      fr: 'Deep-sea creature',
      en: 'Deep-sea creature',
    })
  })
})

describe('defaultLocaleName', () => {
  it('rend l\'anglais, puisque DEFAULT_LOCALE vaut EN', () => {
    expect(
      defaultLocaleName({ fr: 'Créature des profondeurs', en: 'Deep-sea creature' }),
    ).toBe('Deep-sea creature')
  })
})
