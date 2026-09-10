import { extractRewardPreview } from '../../main/domain/campaign/campaign.domain'

const normalLoot = {
  firstClear: {
    gold: 230,
    dust: 55,
    xp: 33,
    guaranteedEquipment: { minRarity: 'COMMON' },
  },
  farm: {
    gold: 50,
    dust: 4,
    xp: 6,
    equipmentDropChance: 0.15,
    equipmentWeights: { COMMON: 80, UNCOMMON: 20 },
    cardChance: 0.005,
  },
}

const bossLoot = {
  firstClear: {
    gold: 5000,
    dust: 1000,
    xp: 200,
    guaranteedEquipment: { minRarity: 'RARE' },
    guaranteedCard: { minRarity: 'EPIC' },
  },
  farm: {
    gold: 150,
    dust: 15,
    xp: 20,
    equipmentDropChance: 0.3,
    equipmentWeights: { UNCOMMON: 40, RARE: 40, EPIC: 18, LEGENDARY: 2 },
    cardChance: 0.02,
  },
}

describe('extractRewardPreview', () => {
  describe('lootTable normal (stage 1-1)', () => {
    it('retourne les montants firstClear corrects', () => {
      const preview = extractRewardPreview(normalLoot, 0)
      expect(preview.firstClear).toEqual({ gold: 230, dust: 55, xp: 33 })
    })

    it('retourne les montants farm corrects', () => {
      const preview = extractRewardPreview(normalLoot, 0)
      expect(preview.farm).toEqual({ gold: 50, dust: 4, xp: 6 })
    })

    it('retourne les chances de drop farm', () => {
      const preview = extractRewardPreview(normalLoot, 0)
      expect(preview.farmEquipmentChance).toBe(0.15)
      expect(preview.farmCardChance).toBe(0.005)
    })

    it('guaranteedEquipment vrai, guaranteedCard faux', () => {
      const preview = extractRewardPreview(normalLoot, 0)
      expect(preview.guaranteedEquipment).toBe(true)
      expect(preview.guaranteedCard).toBe(false)
    })
  })

  describe('lootTable boss (chapter boss avec guaranteedCard)', () => {
    it('retourne les montants firstClear corrects', () => {
      const preview = extractRewardPreview(bossLoot, 0)
      expect(preview.firstClear).toEqual({ gold: 5000, dust: 1000, xp: 200 })
    })

    it('retourne les montants farm corrects', () => {
      const preview = extractRewardPreview(bossLoot, 0)
      expect(preview.farm).toEqual({ gold: 150, dust: 15, xp: 20 })
    })

    it('retourne les chances de drop farm du boss', () => {
      const preview = extractRewardPreview(bossLoot, 0)
      expect(preview.farmEquipmentChance).toBe(0.3)
      expect(preview.farmCardChance).toBe(0.02)
    })

    it('guaranteedEquipment et guaranteedCard tous les deux vrais', () => {
      const preview = extractRewardPreview(bossLoot, 0)
      expect(preview.guaranteedEquipment).toBe(true)
      expect(preview.guaranteedCard).toBe(true)
    })
  })

  describe('cas défensifs', () => {
    it('guaranteedCard null → false', () => {
      const loot = { ...normalLoot, firstClear: { ...normalLoot.firstClear, guaranteedCard: null } }
      const preview = extractRewardPreview(loot, 0)
      expect(preview.guaranteedCard).toBe(false)
    })

    it('guaranteedEquipment absent → false', () => {
      const loot = { ...normalLoot, firstClear: { gold: 100, dust: 10, xp: 10 } }
      const preview = extractRewardPreview(loot, 0)
      expect(preview.guaranteedEquipment).toBe(false)
    })
  })

  // Bonus d'équipe `xp` (task 5, refonte équipe) : multiplicatif, appliqué
  // uniquement à l'XP annoncée (firstClear ET farm), jamais à l'or ni aux
  // chances de drop. Le rang 5 par défaut (teamPerk.xp.perRank = 0.8) donne
  // 4 points de pourcentage — le cas testé par la suite e2e sur la réponse
  // HTTP réelle.
  describe('bonus équipe xp', () => {
    it('0 % = identité (rétrocompatible)', () => {
      const preview = extractRewardPreview(normalLoot, 0)
      expect(preview.firstClear.xp).toBe(33)
      expect(preview.farm.xp).toBe(6)
    })

    it('+4 % (rang 5) arrondit chaque montant indépendamment', () => {
      const preview = extractRewardPreview(bossLoot, 4)
      // 200 * 1.04 = 208 pile ; 20 * 1.04 = 20.8 → arrondi à 21.
      expect(preview.firstClear.xp).toBe(208)
      expect(preview.farm.xp).toBe(21)
    })

    it("n'affecte ni l'or ni les chances de drop", () => {
      const preview = extractRewardPreview(bossLoot, 4)
      expect(preview.firstClear.gold).toBe(5000)
      expect(preview.farm.gold).toBe(150)
      expect(preview.farmEquipmentChance).toBe(0.3)
      expect(preview.farmCardChance).toBe(0.02)
    })
  })
})
