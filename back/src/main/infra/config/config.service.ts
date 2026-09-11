import type { IocContainer } from '../../types/application/ioc'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { PostgresPrismaClient } from '../orm/postgres-client'

const REDIS_TTL_SECONDS = 300 // 5 minutes

export const DEFAULTS: Record<ConfigKey, number> = {
  tokenRegenIntervalMinutes: 60,
  tokenMaxStock: 10,
  pityThreshold: 300,
  dustCommon: 10,
  dustUncommon: 30,
  dustRare: 80,
  dustEpic: 240,
  dustLegendary: 800,
  // taux de variantes en POINTS DE POURCENTAGE (pickVariant roll: Math.random() * 100)
  holoRateRare: 1,
  holoRateEpic: 1.5,
  holoRateLegendary: 2,
  brilliantRateRare: 3,
  brilliantRateEpic: 4,
  brilliantRateLegendary: 5,
  dailyShopPriceCommon: 150,
  dailyShopPriceUncommon: 450,
  dailyShopPriceRare: 2400,
  dailyShopPriceEpic: 10500,
  dailyShopPriceLegendary: 60000,
  xpPerPull: 10,
  'combat.pointsMax': 60,
  'combat.regenSeconds': 900,
  'combat.battleCost': 5,
  'combat.sweepCost': 5,
  // Roue élémentaire : dégâts ×1,30 en avantage, ×0,75 en désavantage, ×1 neutre.
  'combat.elementAdvantageMult': 1.3,
  'combat.elementDisadvantageMult': 0.75,
  // Constante K de la formule de mitigation `K / (K + DEF)`. Mise à l'échelle
  // par unité (cf. mitigationRefFor) pour que la réduction de dégâts d'une
  // carte ne dépende plus de son niveau.
  'combat.defMitigationRef': 100,
  // Valeurs de base des stats de stuff, communes aux alliés ET aux ennemis.
  // Sans base, critDmg seul ne ferait rien et le set correspondant paraîtrait cassé.
  'combat.baseCritRate': 5,
  'combat.baseCritDmg': 150,
  'combat.baseArmorPen': 0,
  'combat.baseLifesteal': 0,
  'gacha.pullTokenCost': 1,
  'xp.base': 100,
  'xp.slope': 44,
  'xp.levelCap': 100,
  'levelup.refillEnergy': 1,
  'card.goldCostBase': 5,
  'card.goldCostExp': 1.6,
  'card.dustCostBase': 0.5,
  'card.dustCostExp': 1.4,
  'card.rarityMultCommon': 1.0,
  'card.rarityMultUncommon': 1.3,
  'card.rarityMultRare': 1.7,
  'card.rarityMultEpic': 2.3,
  'card.rarityMultLegendary': 3.0,
  'wishlist.priceMultiplier': 2,
  'wishlist.cooldownDays': 7,
  'shop.energyDailyCap': 3,
  'equip.goldCostBase': 25,
  'equip.goldCostExp': 1.35,
  'equip.salvageGoldCommon': 10,
  'equip.salvageGoldUncommon': 30,
  'equip.salvageGoldRare': 80,
  'equip.salvageGoldEpic': 240,
  'equip.salvageGoldLegendary': 800,
  'equip.substatHpFlatMin': 20,
  'equip.substatHpFlatMax': 60,
  'equip.substatAtkFlatMin': 5,
  'equip.substatAtkFlatMax': 15,
  'equip.substatDefFlatMin': 5,
  'equip.substatDefFlatMax': 15,
  // Ramenées avec le barème principal : la vitesse ne suivant plus le niveau,
  // quatre sous-stats à 9 auraient dépassé la stat principale légendaire (12).
  'equip.substatSpdFlatMin': 1,
  'equip.substatSpdFlatMax': 3,
  'equip.substatPctMin': 3,
  'equip.substatPctMax': 8,
  // Stats de stuff — bornes calibrées pour rester comparables aux substats
  // existantes (voir §12 point 3 de la spec) : critDmg part plus haut car son
  // impact par point est plus faible (multiplicateur appliqué seulement sur
  // les coups critiques, alors que critRate module la fréquence de ce même gain).
  'equip.substatCritRatePctMin': 2,
  'equip.substatCritRatePctMax': 5,
  'equip.substatCritDmgPctMin': 4,
  'equip.substatCritDmgPctMax': 10,
  'equip.substatArmorPenPctMin': 2,
  'equip.substatArmorPenPctMax': 6,
  'equip.substatLifestealPctMin': 1,
  'equip.substatLifestealPctMax': 4,
  // Bonus de set. Le 2-pièces donne une stat classique, le 4-pièces une stat
  // de stuff. critRate et critDmg sont volontairement sur deux sets différents :
  // ils sont multiplicatifs, donc un build critique doit choisir lequel pousser.
  // Point de calibrage ouvert (§12 de la spec) : valeurs plausibles, non simulées.
  // Bonus de set — un seul par set, accordé au nombre de pièces que le set
  // exige (2, 3 ou 4 ; la taille est en dur dans set-bonuses.ts).
  //
  // Calibré au simulateur de combat (400 combats sur 4 étages, ennemi ajusté
  // pour un témoin sans set à 50 %) sur une cible d'environ 9 points de
  // victoire par emplacement mobilisé : ~18 pt pour un set de 2, ~27 pour un
  // set de 3, ~36 pour un set de 4.
  //
  // DEUX EXCEPTIONS ASSUMÉES, qui rendent moins que la cible parce que leur
  // valeur est CONDITIONNELLE et non plate :
  //
  //  - Fureur (dégâts critiques) ne vaut rien à 5 % de taux de crit de base :
  //    il ne s'applique qu'à un coup sur vingt. Sa force vient d'un build
  //    monté en taux de crit ailleurs (stat principale des bottes, sous-stats
  //    critRatePct), pas de sa propre magnitude — la monter ne corrige rien,
  //    même à 280 % il restait sous Précision à 25 %.
  //  - Percée (pénétration d'armure) ronge une DÉF ennemie aujourd'hui
  //    petite devant `combat.defMitigationRef`. Elle prendra sa valeur quand
  //    la campagne et les tours auront des ennemis lourdement blindés ; la
  //    gonfler d'ici là ne ferait que la rendre absurde contre tout le reste.
  'set.fureurCritDmgPct': 55,
  // Précision et Sangsue restent sous la cible, volontairement. Précision
  // perd de la valeur à mesure que le build monte en crit (rendements
  // décroissants en approchant 100 % : 37 pt à 5 % de crit de base, 18 pt
  // dans un build déjà à 75 %), donc la monter n'aiderait que les builds qui
  // en ont le moins besoin. Sangsue à 16 % rend déjà 27 pt.
  'set.precisionCritRatePct': 25,
  'set.sangsueLifestealPct': 16,
  'set.perceeArmorPenPct': 25,
  'set.assautAtkPct': 16,
  'set.colosseHpPct': 10,
  'set.celeriteSpdPct': 10,
  // Raid d'équipe. attacksPerDay = quota journalier UTC, tous raids
  // confondus. baseHpPerMember : PV du boss par membre au lancement de la
  // semaine — 11 × D_ref (D_ref = dégâts moyens d'une attaque de l'équipe de
  // référence : 3 épiques au plafond du palier 5, gear epic, un contre-pick,
  // moyenné sur les 4 boss), mesuré le 2026-09-08 via
  // `SIM_MODE=raid SIM_GEAR=epic npx tsx scripts/balance-sim.ts`
  // (docs/superpowers/mesures/2026-09-08-raid/rapport.md). Rappel : cette
  // valeur DEFAULTS est create-only en base — une instance déjà bootstrapée
  // garde l'ancienne valeur. Impossible à corriger depuis l'écran
  // /admin/config : son schéma (adminConfigUpdateBodySchema) et son
  // formulaire front (admin.config.tsx) sont des listes blanches figées qui
  // ne connaissent pas les clés raid.*, alors que CONFIG_KEYS ci-dessous les
  // liste bien. Seule voie actuelle : UPDATE direct de la table
  // GlobalConfig (clé = 'raid.xxx'), ou élargir ces deux listes blanches.
  'raid.attacksPerDay': 2,
  'raid.timeoutTurns': 10,
  'raid.baseHpPerMember': 162000,
  // Duel de tirage : chaque joueur engage ses `pullCount` prochains tirages,
  // a `acceptHours` pour accepter et `deadlineHours` pour les faire.
  'duel.pullCount': 5,
  'duel.acceptHours': 24,
  'duel.deadlineHours': 48,
  // Pari : fenêtre de tirages observée chez la cible, bornes de mise en
  // poussière, marge maison en points de pourcentage (elle garantit que la
  // cote reste défavorable au parieur), délai avant remboursement, et
  // plafonds de paris simultanés côté parieur et côté cible.
  'bet.pullWindow': 10,
  'bet.minStake': 50,
  'bet.maxStake': 2000,
  'bet.houseFeePct': 10,
  'bet.deadlineHours': 72,
  'bet.maxOpenPerBettor': 3,
  'bet.maxOpenPerTarget': 3,
  // Progression d'équipe. teamPoints.* = points hebdo par membre selon la
  // source (dégâts de raid, duel gagné, pari gagné, tirage effectué).
  // teamLevel.* = courbe d'XP (xpBase * niveau^xpExp) et plafond de niveau.
  // teamPerk.*  = plafond de rang, gain par rang et niveau de déblocage pour
  // chacun des quatre perks (loot, raid, xp, forge). Le plafond est PAR perk :
  // `raid` est le seul dont l'effet mord sur des PV de boss calibrés à la main,
  // et il plafonne plus bas que les trois autres (voir sa ligne).
  // Diviseur des degats de raid. Cale sur l'echelle REELLE du jeu, pas sur les
  // chiffres de la maquette : raid.baseHpPerMember vaut 162000 PAR MEMBRE, donc
  // la part d'un membre sur sa semaine represente 162000 degats. A 300, cela fait
  // 540 points, soit ~1060 avec les tirages et les duels — l'ordre de grandeur de
  // la maquette (1180 pour le meilleur contributeur). A 2, un membre marquait
  // 81000 points et l'equipe touchait le niveau 50 en moins de deux semaines.
  'teamPoints.damagePerPoint': 300,
  // Duels et paris rapportent DÉLIBÉRÉMENT peu. Ils sont bon marché à
  // lancer : un duel se règle dès que les deux joueurs ont fait leurs 5
  // tirages — quelques minutes pour qui en fait 60 par jour — et un parieur
  // tient 3 paris ouverts dont la fenêtre de 10 tirages se remplit en
  // heures. Comptés à l'échelle du raid (50 et 30), une quinzaine de duels
  // et une vingtaine de paris par semaine rapportaient ~1350 points là où
  // la part de raid d'un membre en vaut 540 et ses tirages ~420 : les deux
  // mécaniques sociales pesaient plus lourd que tout le reste réuni. À 8 et
  // 3, la même activité vaut ~180 points, soit environ un sixième du total
  // hebdomadaire — de quoi récompenser sans faire de l'XP d'équipe une
  // affaire de spam de paris.
  'teamPoints.duelWon': 8,
  'teamPoints.betWon': 3,
  'teamPoints.perPull': 1,
  // Courbe d'XP d'equipe : passer du niveau n au suivant coute
  // `xpBase * n^xpExp`.
  //
  // La base est passee de 175 a 1050 (x6) pour allonger considerablement la
  // progression. Le niveau qui compte n'est PAS le plafond (50) mais le 18 :
  // c'est la que les 17 rangs de bonus sont tous achetes, donc la fin de la
  // progression utile. A 175, une equipe de 35 membres actifs y arrivait en
  // moins de TROIS semaines, une equipe de 12 en huit. A 1050 il leur faut
  // respectivement ~17 et ~50 semaines, et le plafond 50 reste ce qu'il etait
  // deja : du prestige hors d'atteinte a vue humaine.
  //
  // C'est la BASE qu'on monte, pas l'exposant, et pas les gains. Monter
  // l'exposant n'aurait allonge que la queue de courbe, deja interminable,
  // sans toucher les dix-huit premiers niveaux. Baisser les gains aurait
  // rouvert l'equilibre entre les quatre sources — degats de raid ~540 points
  // par membre et par semaine, tirages ~420, duels ~120, paris ~60 — qui a ete
  // cale a la main. Etirer la courbe ne change aucun de ces rapports.
  'teamLevel.xpBase': 1050,
  'teamLevel.xpExp': 1.6,
  'teamLevel.maxLevel': 50,
  'teamPerk.loot.perRank': 0.5,
  'teamPerk.loot.unlockLevel': 1,
  'teamPerk.loot.maxRank': 5,
  // `raid.maxRank` a ete ramene de 5 a 2. A 5, le bonus donnait +2 attaques
  // par jour sur les 2 de base : la capacite hebdomadaire d'une equipe de 35
  // passait de 7,2 a 14,4 M de degats contre 5,67 M de PV, soit un boss tombe
  // au 3e jour au lieu du 6e. A 2 il donne +1 attaque, x1,5 au lieu de x2.
  // `perRank` a 0,5 avec le plancher entier de `perkEffect` veut dire une
  // attaque tous les DEUX rangs : le rang 1 ne change encore rien, le rang 2
  // donne l'attaque.
  'teamPerk.raid.perRank': 0.5,
  'teamPerk.raid.unlockLevel': 4,
  'teamPerk.raid.maxRank': 2,
  'teamPerk.xp.perRank': 0.8,
  'teamPerk.xp.unlockLevel': 8,
  'teamPerk.xp.maxRank': 5,
  'teamPerk.forge.perRank': 1,
  'teamPerk.forge.unlockLevel': 16,
  'teamPerk.forge.maxRank': 5,
  'team.maxMembers': 35,
  'team.recruitDays': 7,
  'teamRaid.historyLimit': 6,
}

export class ConfigService implements ConfigServiceInterface {
  readonly #prisma: PostgresPrismaClient
  readonly #redis: RedisClientInterface
  readonly #envDefaults: Record<ConfigKey, number>

  constructor({ postgresOrm, redisClient }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#redis = redisClient
    this.#envDefaults = { ...DEFAULTS }
  }

  async get(key: ConfigKey): Promise<number> {
    const redisKey = `config:${key}`

    // 1. Redis cache
    const cached = await this.#redis.get(redisKey)
    if (cached !== null) {
      return Number(cached)
    }

    // 2. DB
    const row = await this.#prisma.globalConfig.findUnique({ where: { key } })
    if (row !== null) {
      await this.#redis.set(redisKey, row.value, REDIS_TTL_SECONDS)
      return Number(row.value)
    }

    // 3. Env var / hardcoded default
    return this.#envDefaults[key] ?? 0
  }

  async getMany<K extends ConfigKey>(...keys: K[]): Promise<Record<K, number>> {
    const values = await Promise.all(keys.map((k) => this.get(k)))
    return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<
      K,
      number
    >
  }

  async set(key: ConfigKey, value: number): Promise<void> {
    await this.#prisma.globalConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
    await this.#redis.del(`config:${key}`)
  }

  async bootstrap(): Promise<void> {
    // createMany + skipDuplicates plutôt qu'une boucle d'upsert : une seule
    // requête au lieu d'une soixantaine, et surtout pas de fenêtre de course.
    // Deux bootstraps concurrents sur la même base (deux suites e2e lancées en
    // parallèle, par exemple) faisaient échouer l'upsert sur la contrainte
    // d'unicité de `key` entre son SELECT et son INSERT.
    // Sémantique préservée : on crée ce qui manque, on n'écrase jamais
    // une valeur existante.
    await this.#prisma.globalConfig.createMany({
      data: Object.entries(this.#envDefaults).map(([key, defaultValue]) => ({
        key,
        value: String(defaultValue),
      })),
      skipDuplicates: true,
    })

    await this.#prisma.skillConfig.createMany({
      data: [{ id: 1, resetCostPerPoint: 50 }],
      skipDuplicates: true,
    })
  }
}
