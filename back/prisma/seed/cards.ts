import type { PrismaClient } from '../../src/generated/client'

/**
 * Préfixe de stockage des images de cartes selon l'environnement.
 * - Prod  : `cards/humans/…`          (bucket gachapon → gachapon/cards/humans)
 * - Dev   : `staging/cards/humans/…`  (bucket gachapon → gachapon/staging/cards/humans)
 */
const IMAGE_PREFIX =
  process.env.NODE_ENV === 'production'
    ? 'cards/humans'
    : 'staging/cards/humans'

/**
 * Set « Humains ». Stats de base (baseHp/Atk/Def/Spd) pré-calculées par carte :
 * dérivées du barème par rareté puis variées par archétype (Tank plus résistant,
 * Assassin/Tireur plus rapide et offensif, Mage glass-cannon, etc.).
 * Source de vérité partagée avec le tcg_kit (onglet Production, colonnes PV/ATQ/DEF/VIT).
 */
const CARDS = [
  // COMMON — dropWeight 85 chacune
  { id: 'HUM-001', name: 'Aurore la Paysanne', rarity: 'COMMON', dropWeight: 85, baseHp: 116, baseAtk: 9, baseDef: 5, baseSpd: 95, passiveKey: null },  // Soutien
  { id: 'HUM-002', name: 'Roland le Garde', rarity: 'COMMON', dropWeight: 85, baseHp: 123, baseAtk: 8, baseDef: 8, baseSpd: 81, passiveKey: null },  // Tank
  { id: 'HUM-003', name: 'Mira la Voleuse', rarity: 'COMMON', dropWeight: 85, baseHp: 85, baseAtk: 12, baseDef: 4, baseSpd: 123, passiveKey: null },  // Assassin
  { id: 'HUM-004', name: 'Frère Anselme', rarity: 'COMMON', dropWeight: 85, baseHp: 81, baseAtk: 15, baseDef: 3, baseSpd: 94, passiveKey: null },  // Mage
  { id: 'HUM-005', name: 'Gauthier le Forgeron', rarity: 'COMMON', dropWeight: 85, baseHp: 130, baseAtk: 8, baseDef: 8, baseSpd: 81, passiveKey: null },  // Tank
  { id: 'HUM-006', name: 'Léna l\'Archère', rarity: 'COMMON', dropWeight: 85, baseHp: 82, baseAtk: 13, baseDef: 4, baseSpd: 100, passiveKey: null },  // Tireur
  { id: 'HUM-007', name: 'Aldric', rarity: 'COMMON', dropWeight: 85, baseHp: 130, baseAtk: 9, baseDef: 8, baseSpd: 75, passiveKey: null },  // Tank
  { id: 'HUM-008', name: 'Aveline', rarity: 'COMMON', dropWeight: 85, baseHp: 106, baseAtk: 10, baseDef: 5, baseSpd: 85, passiveKey: null },  // Équilibré
  { id: 'HUM-009', name: 'Gauvain', rarity: 'COMMON', dropWeight: 85, baseHp: 131, baseAtk: 8, baseDef: 7, baseSpd: 82, passiveKey: null },  // Tank
  { id: 'HUM-010', name: 'Tristan', rarity: 'COMMON', dropWeight: 85, baseHp: 87, baseAtk: 14, baseDef: 4, baseSpd: 97, passiveKey: null },  // Tireur
  { id: 'HUM-011', name: 'Mahaut', rarity: 'COMMON', dropWeight: 85, baseHp: 88, baseAtk: 13, baseDef: 4, baseSpd: 102, passiveKey: null },  // Tireur
  { id: 'HUM-012', name: 'Lucien', rarity: 'COMMON', dropWeight: 85, baseHp: 127, baseAtk: 8, baseDef: 8, baseSpd: 72, passiveKey: null },  // Tank
  { id: 'HUM-013', name: 'Alix', rarity: 'COMMON', dropWeight: 85, baseHp: 100, baseAtk: 11, baseDef: 5, baseSpd: 95, passiveKey: null },  // Équilibré
  { id: 'HUM-014', name: 'Thibault', rarity: 'COMMON', dropWeight: 85, baseHp: 106, baseAtk: 11, baseDef: 5, baseSpd: 92, passiveKey: null },  // Équilibré
  { id: 'HUM-015', name: 'Enguerrand', rarity: 'COMMON', dropWeight: 85, baseHp: 96, baseAtk: 9, baseDef: 5, baseSpd: 95, passiveKey: null },  // Équilibré
  { id: 'HUM-016', name: 'Yseult', rarity: 'COMMON', dropWeight: 85, baseHp: 78, baseAtk: 12, baseDef: 4, baseSpd: 110, passiveKey: null },  // Assassin
  { id: 'HUM-017', name: 'Constant', rarity: 'COMMON', dropWeight: 85, baseHp: 130, baseAtk: 8, baseDef: 7, baseSpd: 76, passiveKey: null },  // Tank
  { id: 'HUM-018', name: 'Blanche', rarity: 'COMMON', dropWeight: 85, baseHp: 103, baseAtk: 10, baseDef: 5, baseSpd: 91, passiveKey: null },  // Équilibré
  { id: 'HUM-019', name: 'Lyra la Vive', rarity: 'COMMON', dropWeight: 85, baseHp: 106, baseAtk: 10, baseDef: 5, baseSpd: 94, passiveKey: null },  // Équilibré
  // UNCOMMON — dropWeight 38 chacune
  { id: 'HUM-020', name: 'Baudouin', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 171, baseAtk: 12, baseDef: 10, baseSpd: 81, passiveKey: null },  // Tank
  { id: 'HUM-021', name: 'Aymeric', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 118, baseAtk: 18, baseDef: 5, baseSpd: 105, passiveKey: null },  // Tireur
  { id: 'HUM-022', name: 'Eleonore', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 122, baseAtk: 18, baseDef: 5, baseSpd: 98, passiveKey: null },  // Tireur
  { id: 'HUM-023', name: 'Foulques', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 178, baseAtk: 11, baseDef: 10, baseSpd: 81, passiveKey: null },  // Tank
  { id: 'HUM-024', name: 'Mélisande', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 135, baseAtk: 15, baseDef: 7, baseSpd: 100, passiveKey: null },  // Équilibré
  { id: 'HUM-025', name: 'Perceval', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 131, baseAtk: 14, baseDef: 7, baseSpd: 100, passiveKey: null },  // Équilibré
  { id: 'HUM-026', name: 'Kenji le Ronin', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 106, baseAtk: 16, baseDef: 5, baseSpd: 119, passiveKey: null },  // Assassin
  { id: 'HUM-027', name: 'Dame Coralie', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 149, baseAtk: 15, baseDef: 8, baseSpd: 88, passiveKey: null },  // Combattant
  { id: 'HUM-028', name: 'Séléné au Fouet', rarity: 'UNCOMMON', dropWeight: 38, baseHp: 119, baseAtk: 17, baseDef: 5, baseSpd: 115, passiveKey: null },  // Assassin
  // RARE — dropWeight 16 chacune
  { id: 'HUM-029', name: 'Capitaine Hélène', rarity: 'RARE', dropWeight: 16, baseHp: 249, baseAtk: 16, baseDef: 14, baseSpd: 88, passiveKey: null },  // Tank
  { id: 'HUM-030', name: 'Dame Ysolde la Paladine', rarity: 'RARE', dropWeight: 16, baseHp: 250, baseAtk: 16, baseDef: 15, baseSpd: 80, passiveKey: null },  // Tank
  { id: 'HUM-031', name: 'Séraphine la Magicienne', rarity: 'RARE', dropWeight: 16, baseHp: 159, baseAtk: 27, baseDef: 7, baseSpd: 96, passiveKey: null },  // Mage
  { id: 'HUM-032', name: 'Josselin', rarity: 'RARE', dropWeight: 16, baseHp: 192, baseAtk: 20, baseDef: 10, baseSpd: 93, passiveKey: null },  // Équilibré
  { id: 'HUM-033', name: 'Oriane', rarity: 'RARE', dropWeight: 16, baseHp: 155, baseAtk: 23, baseDef: 7, baseSpd: 135, passiveKey: null },  // Assassin
  { id: 'HUM-034', name: 'Akira Double-Lame', rarity: 'RARE', dropWeight: 16, baseHp: 164, baseAtk: 23, baseDef: 8, baseSpd: 131, passiveKey: null },  // Assassin
  // EPIC — dropWeight 8 chacune
  { id: 'HUM-035', name: 'Archimage Cael', rarity: 'EPIC', dropWeight: 8, baseHp: 254, baseAtk: 44, baseDef: 11, baseSpd: 96, passiveKey: 'PIERCE' },  // Mage
  { id: 'HUM-036', name: 'Garnier', rarity: 'EPIC', dropWeight: 8, baseHp: 408, baseAtk: 25, baseDef: 22, baseSpd: 88, passiveKey: 'AEGIS' },  // Tank
  // LEGENDARY — dropWeight 2 chacune
  { id: 'HUM-037', name: 'Roi Aldric', rarity: 'LEGENDARY', dropWeight: 2, baseHp: 597, baseAtk: 51, baseDef: 30, baseSpd: 106, passiveKey: 'NEMESIS' },  // Combattant
  { id: 'HUM-038', name: 'Reine Isaure', rarity: 'LEGENDARY', dropWeight: 2, baseHp: 584, baseAtk: 54, baseDef: 27, baseSpd: 107, passiveKey: 'BANNER' },  // Combattant
] as const

export async function seedCards(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  const set = await tx.cardSet.create({
    data: {
      name: 'Royaume des Humains',
      description:
        'Le set des Humains du Gachapon. 38 combattants à collectionner, de la paysanne au roi.',
      isActive: true,
    },
  })

  for (const card of CARDS) {
    await tx.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `${IMAGE_PREFIX}/${card.id}.png`,
        rarity: card.rarity,
        dropWeight: card.dropWeight,
        baseHp: card.baseHp,
        baseAtk: card.baseAtk,
        baseDef: card.baseDef,
        baseSpd: card.baseSpd,
        passiveKey: card.passiveKey ?? null,
      },
    })
  }

  console.log(`  CardSet "${set.name}" + ${CARDS.length} cartes créées`)
}
