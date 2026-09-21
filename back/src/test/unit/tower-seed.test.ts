import { describe, expect, it } from '@jest/globals'

import {
  FAMILIES,
  FAMILIES_BY_ELEMENT,
  FAMILY_ELEMENTS,
  type FamilySlug,
} from '../../../prisma/seed/bestiary'
import { RARITY_BASE } from '../../../prisma/seed/campaign'
import {
  towerFloorProfile,
  towerReferenceWinRate,
} from '../../../prisma/seed/balance-calibration'
import {
  TOWER_ELEMENTS,
  TOWER_FLOOR_COUNT,
  buildTowerFloors,
  towerAoeUnitCount,
  towerEnemyPower,
  towerFloorLoot,
} from '../../../prisma/seed/tower'
import { EquipmentSlot } from '../../generated/client'
import {
  CAMPAIGN_EQUIPMENT_SLOTS,
  TOWER_EQUIPMENT_SLOTS,
  TOWER_SLOT_BY_ELEMENT,
} from '../../main/domain/tower/tower-slots'

describe('seed des tours', () => {
  const etages = buildTowerFloors()

  it('produit 40 étages (4 tours x 10)', () => {
    expect(etages).toHaveLength(40)
  })

  it('ne couvre que les 4 éléments du cycle, jamais LIGHT ni DARK', () => {
    expect([...TOWER_ELEMENTS].sort()).toEqual(['EARTH', 'FIRE', 'NATURE', 'WATER'])
    for (const e of etages) {
      expect(TOWER_ELEMENTS).toContain(e.element)
    }
  })

  it('associe chaque tour à un slot distinct', () => {
    const slots = Object.values(TOWER_SLOT_BY_ELEMENT)
    expect(new Set(slots).size).toBe(4)
    expect(slots).not.toContain('WEAPON')
    expect(slots).not.toContain('ARMOR')
    expect(slots).not.toContain('RING')
  })

  it('les poids de rareté somment à 100 à chaque étage', () => {
    for (let f = 1; f <= 10; f++) {
      const total = Object.values(towerFloorLoot(f).farm.equipmentWeights).reduce(
        (a, b) => a + (b as number),
        0,
      )
      expect(total).toBeCloseTo(100, 6)
    }
  })

  it('droppe une pièce garantie à chaque étage', () => {
    for (let f = 1; f <= 10; f++) {
      expect(towerFloorLoot(f).farm.equipmentDropChance).toBe(1)
    }
  })

  it('la part d EPIC+ croît strictement avec l étage', () => {
    const partEpicPlus = (f: number) => {
      const w = towerFloorLoot(f).farm.equipmentWeights as Record<string, number>
      return (w.EPIC ?? 0) + (w.LEGENDARY ?? 0)
    }
    for (let f = 2; f <= 10; f++) {
      expect(partEpicPlus(f)).toBeGreaterThanOrEqual(partEpicPlus(f - 1))
    }
    expect(partEpicPlus(10)).toBeGreaterThan(partEpicPlus(1))
  })

  it('la difficulté est STRICTEMENT croissante d’un étage au suivant', () => {
    // Remplace l'ancien contrat « montée rapide puis paliers fins » (rapports
    // décroissants, du ×2,2 au ×1,06). Cette forme-là tassait les étages 6 à
    // 10 dans 30 % d'écart : une fois l'étage 6 franchi, les quatre suivants
    // tombaient sans rien demander de plus. La courbe est désormais fixée
    // étage par étage sur le joueur qu'il doit accueillir
    // (TOWER_FLOOR_PROFILES), et la seule forme imposée est la monotonie.
    for (let f = 2; f <= TOWER_FLOOR_COUNT; f++) {
      expect(towerEnemyPower(f).baseHp).toBeGreaterThan(
        towerEnemyPower(f - 1).baseHp,
      )
      expect(towerEnemyPower(f).baseAtk).toBeGreaterThan(
        towerEnemyPower(f - 1).baseAtk,
      )
    }
  })

  it('un seul ennemi frappe en AOE_3, et seulement au dernier étage', () => {
    // Trois AOE_3 simultanés, c'est neuf fois les dégâts entrants d'un trio
    // normal : mesuré au simulateur, une équipe épique n12 gagne 100 % contre
    // trois BASIC et 0 % contre trois AOE_3 AUX MÊMES STATS. Ce n'était pas un
    // cran de difficulté mais un interrupteur — et c'est lui, pas la courbe,
    // qui produisait le saut de 98 % à 0 % entre les étages 9 et 10.
    for (let f = 1; f < TOWER_FLOOR_COUNT; f++) {
      expect(towerAoeUnitCount(f)).toBe(0)
    }
    expect(towerAoeUnitCount(TOWER_FLOOR_COUNT)).toBe(1)
    for (const etage of etages) {
      const aoe = etage.enemyTeam.filter((e) => e.attackPattern === 'AOE_3')
      expect(aoe).toHaveLength(etage.index === TOWER_FLOOR_COUNT ? 1 : 0)
    }
  })

  it('chaque étage tient la cible de victoire de son profil de référence', () => {
    // LE test d'équilibrage de la tour : pour chaque étage, le joueur que cet
    // étage vise doit le gagner à peu près `target` fois sur dix. C'est ce
    // qu'aucun test ne vérifiait — la courbe précédente avait été calibrée sur
    // la JAUGE affichée (`campaign-power.ts`), dont la prime de menace ×7 pour
    // AOE_3, appliquée à trois unités, gonflait l'étage 10 d'un facteur 7 :
    // il affichait la puissance du boss 8-10 avec les stats du stage 5-1.
    //
    // Bande large (±15 points) : 80 combats donnent un écart-type
    // d'échantillonnage d'environ 5,6 points, et le test doit signaler une
    // DÉRIVE, pas du bruit.
    for (let f = 1; f <= TOWER_FLOOR_COUNT; f++) {
      const { target } = towerFloorProfile(f)
      const mesure = towerReferenceWinRate(f, 80)
      expect(mesure).toBeGreaterThanOrEqual(target - 0.15)
      expect(mesure).toBeLessThanOrEqual(target + 0.15)
    }
  })

  it('le profil de référence exige de plus en plus, étage après étage', () => {
    // La cible n'a de sens que si les profils montent : niveau de carte
    // jamais décroissant, nombre de pièces jamais décroissant, et taux visé
    // jamais croissant (le bas est une porte, le haut un contrôle de build).
    for (let f = 2; f <= TOWER_FLOOR_COUNT; f++) {
      const avant = towerFloorProfile(f - 1)
      const apres = towerFloorProfile(f)
      expect(apres.level).toBeGreaterThanOrEqual(avant.level)
      expect(apres.gearCount).toBeGreaterThanOrEqual(avant.gearCount)
      expect(apres.target).toBeLessThanOrEqual(avant.target)
    }
    // Au-delà de l'étage 6 le joueur est au plafond de niveau : la tour ne
    // demande plus que de l'ÉQUIPEMENT, comme la phase 2 de la campagne.
    expect(towerFloorProfile(TOWER_FLOOR_COUNT).level).toBe(70)
  })

  it('le butin ne suit PAS la difficulté : il reste celui d’avant le recalibrage', () => {
    // `towerFloorLoot` lisait la même constante que la difficulté. Multiplier
    // les échelles par quatre aurait multiplié or, poussière et XP d'autant —
    // un rééquilibrage de difficulté n'a pas à déplacer l'économie. Les
    // valeurs ci-dessous sont celles en production avant le recalibrage.
    const attendu: Record<number, [number, number, number, number]> = {
      1: [200, 120, 40, 25],
      5: [1720, 1032, 344, 215],
      10: [3380, 2028, 676, 422],
    }
    for (const [floor, [fcGold, fcDust, farmGold, farmDust]] of Object.entries(
      attendu,
    )) {
      const loot = towerFloorLoot(Number(floor))
      expect(loot.firstClear.gold).toBe(fcGold)
      expect(loot.firstClear.dust).toBe(fcDust)
      expect(loot.farm.gold).toBe(farmGold)
      expect(loot.farm.dust).toBe(farmDust)
    }
  })

  it('le butin monte moins vite que la difficulté', () => {
    // Conséquence directe du gel : progresser reste payant (le butin croît),
    // mais farmer le haut de la tour ne devient pas la seule option rentable.
    const rapportButin =
      towerFloorLoot(TOWER_FLOOR_COUNT).farm.gold / towerFloorLoot(1).farm.gold
    const rapportDifficulte =
      towerEnemyPower(TOWER_FLOOR_COUNT).baseHp / towerEnemyPower(1).baseHp
    expect(rapportButin).toBeLessThan(rapportDifficulte)
  })

  it('chaque étage a ses propres taux de rareté', () => {
    // Monter est récompensé par le BUTIN et non par la difficulté : deux
    // étages voisins ne doivent jamais partager la même table de raretés,
    // sinon l'étage supérieur n'apporte rien.
    const table = (f: number) =>
      JSON.stringify(towerFloorLoot(f).farm.equipmentWeights)
    for (let f = 2; f <= 10; f++) {
      expect(table(f)).not.toBe(table(f - 1))
    }
  })

  it('le profil de base des ennemis de tour suit RARITY_BASE.EPIC de la campagne, pas un littéral recopié', () => {
    // Le profil de base reste EXACTEMENT celui d'EPIC en campagne, mis à
    // l'échelle de l'étage — sinon la puissance des tours dérive en silence
    // d'un futur rééquilibrage de campagne (voir campaign.ts). L'étage 1
    // n'étant plus à l'échelle ×1, on vérifie le RAPPORT plutôt que l'égalité.
    const p1 = towerEnemyPower(1)
    const echelle = p1.baseHp / RARITY_BASE.EPIC.hp
    expect(echelle).toBeGreaterThan(0)
    expect(p1.baseAtk).toBe(Math.round(RARITY_BASE.EPIC.atk * echelle))
    expect(p1.baseDef).toBe(Math.round(RARITY_BASE.EPIC.def * echelle))
    // La vitesse ne suit pas l'échelle de l'étage, seulement son index.
    expect(p1.baseSpd).toBe(RARITY_BASE.EPIC.spd)
  })

  it('chaque ennemi porte son mitigationScale', () => {
    for (const e of etages) {
      for (const ennemi of e.enemyTeam) {
        expect(typeof ennemi.mitigationScale).toBe('number')
        expect(ennemi.mitigationScale).toBeGreaterThan(0)
      }
    }
  })
})

describe('apparences des monstres de tour', () => {
  const etages = buildTowerFloors()

  // `monsters/{famille}/{PREFIX}-{numero}` — découpé une fois ici pour que
  // chaque test dise ce qu'il vérifie et non comment lire un chemin.
  const lire = (appearance: string) => {
    const m = /^monsters\/([a-z]+)\/([A-Z]+)-(\d{3})$/.exec(appearance)
    if (!m) {
      throw new Error(`Apparence mal formée : ${appearance}`)
    }
    return { famille: m[1] as FamilySlug, prefix: m[2], numero: Number(m[3]) }
  }

  // Le garde-fou qui manquait : le seed écrivait `appearance: null` pour les
  // 120 ennemis de tour, et aucun test ne le voyait — l'écran affichait un
  // placeholder sans rien signaler. Cf. seed/campaign.ts, qui lui seede bien
  // ses sprites.
  it('chaque ennemi de tour porte un sprite', () => {
    expect(etages).toHaveLength(40)
    for (const etage of etages) {
      expect(etage.enemyTeam).toHaveLength(3)
      for (const ennemi of etage.enemyTeam) {
        expect(typeof ennemi.appearance).toBe('string')
        expect(ennemi.appearance).toMatch(/^monsters\/[a-z]+\/[A-Z]+-\d{3}$/)
      }
    }
  })

  it("le sprite d'un ennemi appartient à une famille de l'élément de sa tour", () => {
    // Décision de design : une tour peut aligner plusieurs FAMILLES, mais
    // toutes de son élément — le contre-pick reste lisible (« une tour = un
    // élément à contrer ») et la règle « une famille = un élément » que la
    // campagne enseigne n'est pas contredite.
    for (const etage of etages) {
      for (const ennemi of etage.enemyTeam) {
        expect(FAMILY_ELEMENTS[lire(ennemi.appearance).famille]).toBe(
          etage.element,
        )
        expect(ennemi.element).toBe(etage.element)
      }
    }
  })

  it('ne pointe jamais vers un fichier qui n’existe pas', () => {
    // Le numéro du sprite doit rester dans 1..count de sa famille : au-delà,
    // l'image est un 404 silencieux côté MinIO.
    for (const etage of etages) {
      for (const ennemi of etage.enemyTeam) {
        const { famille, prefix, numero } = lire(ennemi.appearance)
        const fam = FAMILIES[famille]
        expect(fam).toBeDefined()
        expect(prefix).toBe(fam.prefix)
        expect(numero).toBeGreaterThanOrEqual(1)
        expect(numero).toBeLessThanOrEqual(fam.count)
      }
    }
  })

  it('n’affiche jamais deux fois le même sprite dans un étage', () => {
    for (const etage of etages) {
      const sprites = etage.enemyTeam.map((e) => e.appearance)
      expect(new Set(sprites).size).toBe(3)
    }
  })

  it('alterne entre plusieurs familles, toutes de l’élément de la tour', () => {
    // Chaque tour doit MÉLANGER ses familles, pas s'en tenir à une seule —
    // sauf Monolithe, à qui TERRE n'en offre qu'une (les basilics).
    for (const element of TOWER_ELEMENTS) {
      const familles = new Set(
        etages
          .filter((e) => e.element === element)
          .flatMap((e) => e.enemyTeam.map((x) => lire(x.appearance).famille)),
      )
      expect(familles).toEqual(new Set(FAMILIES_BY_ELEMENT[element]))
    }
  })

  it('tient la répartition mesurée à la conception', () => {
    // Une tour = 30 emplacements. La rotation `(étage + slot) % familles`
    // (celle de la campagne, reprise telle quelle) donne la répartition
    // ci-dessous. Elle est VERROUILLÉE ici : c'est le compromis retenu —
    // 3 familles différentes par étage plutôt qu'un maximum de sprites
    // distincts. Une répartition pondérée par la taille des familles
    // monterait NATURE à 19/30, au prix d'étages mono-famille.
    //
    // La répétition n'est pas un défaut d'algorithme mais une pénurie
    // d'images : NATURE compte deux familles de 3 sprites (champignons,
    // mimics) et TERRE n'a que 7 basilics. Uploader des sprites et monter le
    // `count` correspondant dans `bestiary.ts` fera monter ces chiffres tout
    // seul — ce test le signalera alors, et c'est voulu.
    const attendu: Record<
      (typeof TOWER_ELEMENTS)[number],
      { distincts: number; max: number }
    > = {
      FIRE: { distincts: 29, max: 2 },
      WATER: { distincts: 24, max: 2 },
      NATURE: { distincts: 16, max: 4 },
      EARTH: { distincts: 7, max: 5 },
    }
    for (const element of TOWER_ELEMENTS) {
      const sprites = etages
        .filter((e) => e.element === element)
        .flatMap((e) => e.enemyTeam.map((x) => x.appearance))
      expect(sprites).toHaveLength(30)
      const compte = new Map<string, number>()
      for (const sprite of sprites) {
        compte.set(sprite, (compte.get(sprite) ?? 0) + 1)
      }
      const cible = attendu[element]
      expect(compte.size).toBe(cible.distincts)
      expect(Math.max(...compte.values())).toBe(cible.max)
    }
  })

  it('ne consomme jamais plus de sprites qu’il n’en existe', () => {
    // Filet indépendant de la table ci-dessus : le nombre de sprites
    // distincts utilisés ne peut pas dépasser ce que l'élément possède.
    for (const element of TOWER_ELEMENTS) {
      const dispo = FAMILIES_BY_ELEMENT[element].reduce(
        (total, slug) => total + FAMILIES[slug].count,
        0,
      )
      const distincts = new Set(
        etages
          .filter((e) => e.element === element)
          .flatMap((e) => e.enemyTeam.map((x) => x.appearance)),
      ).size
      expect(distincts).toBeLessThanOrEqual(Math.min(dispo, 30))
    }
  })
})

describe('CAMPAIGN_EQUIPMENT_SLOTS — pool de drop campagne (G1)', () => {
  it('aucun slot de tour ne peut sortir d\'un drop de campagne', () => {
    for (const slot of TOWER_EQUIPMENT_SLOTS) {
      expect(CAMPAIGN_EQUIPMENT_SLOTS).not.toContain(slot)
    }
  })

  it('tour + campagne recouvrent exactement tout l\'enum EquipmentSlot, sans trou ni doublon', () => {
    const combined = [...TOWER_EQUIPMENT_SLOTS, ...CAMPAIGN_EQUIPMENT_SLOTS].sort()
    expect(combined).toEqual([...Object.values(EquipmentSlot)].sort())
    // Pas de doublon : les deux ensembles partitionnent l'enum.
    expect(new Set(combined).size).toBe(combined.length)
  })

  it('les 3 slots classiques (WEAPON/ARMOR/RING) sont les seuls slots de campagne actuels', () => {
    expect([...CAMPAIGN_EQUIPMENT_SLOTS].sort()).toEqual(
      ['RING', 'ARMOR', 'WEAPON'].sort(),
    )
  })
})
