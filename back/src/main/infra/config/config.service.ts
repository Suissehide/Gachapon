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
  // Courbe ×5 (2026-09-15) : un joueur actif atteignait le niveau 30 en un
  // jour. La cause mesurée est `levelup.refillEnergy`, qui remet l'énergie au
  // max à CHAQUE montée et fait passer la journée de 31 à ~146 combats — la
  // boucle XP → niveau → énergie → combats → XP. Le refill est conservé par
  // choix de design, la courbe le compense donc frontalement.
  //
  // Cadence en BORNE HAUTE (`xp-pacing.test.ts`, joueur qui ne perd jamais et
  // n'est freiné que par l'énergie) : J1 niveau 14, J15 niveau 30, J30 niveau
  // 45, J90 niveau 76, J200 niveau 100. La borne BASSE
  // (`economy-progression.test.ts`, joueur freiné par la difficulté) donne
  // niveau 48 à J90 : la cadence réelle vit entre les deux.
  'xp.base': 500,
  'xp.slope': 220,
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
  // Prix d'un vœu = prix de la boutique du jour pour la rareté × ce facteur.
  // Il mesure une seule chose : ce que coûte le fait de CHOISIR la carte
  // plutôt que de la subir au hasard.
  //
  // Par rareté depuis le 2026-09-21. Le facteur unique à 2 ne pouvait pas
  // tenir les deux bouts du barème : le monter assez pour que le rare cesse
  // d'être une journée de revenu envoyait le légendaire à 80 jours d'épargne.
  // Le légendaire descend donc à 2,5 là où le milieu de barème monte à 5.
  'wishlist.priceMultiplierCommon': 4,
  'wishlist.priceMultiplierUncommon': 4,
  'wishlist.priceMultiplierRare': 5,
  'wishlist.priceMultiplierEpic': 5,
  'wishlist.priceMultiplierLegendary': 2.5,
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
  //    même à 280 % il restait sous Affût à 25 %.
  //  - Percée (pénétration d'armure) ronge une DÉF ennemie aujourd'hui
  //    petite devant `combat.defMitigationRef`. Elle prendra sa valeur quand
  //    la campagne et les tours auront des ennemis lourdement blindés ; la
  //    gonfler d'ici là ne ferait que la rendre absurde contre tout le reste.
  'set.fureurCritDmgPct': 55,
  // Affût exige 3 pièces (set-bonuses.ts), sa cible est donc 27 pt et non 36.
  // Sa valeur mesurée l'encadre au lieu de rester dessous : 37 pt à 5 % de
  // crit de base, 18 pt dans un build déjà à 75 % — le taux de crit a des
  // rendements décroissants en approchant 100 %. D'où la magnitude inchangée
  // au passage de 4 à 3 pièces : la monter n'aiderait que les builds qui en
  // ont le moins besoin, la baisser punirait ceux qui démarrent.
  // Sangsue, elle, reste sous sa cible de set de 4, volontairement : 27 pt.
  'set.affutCritRatePct': 25,
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
  // Effectif MINIMUM facturé dans les PV du boss, même pour une équipe plus
  // petite : sans lui, monter une équipe à un joueur donnait un boss à sa
  // taille et les quatre paliers toutes les semaines.
  'raid.minMembers': 10,
  // Points de pourcentage de PV ajoutés PAR NIVEAU, composés. Le niveau monte
  // d'un cran par victoire et redescend d'un cran par semaine sans victoire :
  // le système s'arrête tout seul là où l'équipe ne suit plus, d'où l'absence
  // de plafond. À 10, une équipe assidue plafonne vers le niveau 2 (niveau 6
  // avec le bonus d'équipe `raid` au rang 2).
  'raid.levelHpBonusPct': 10,
  // Bonus de lot par niveau, en POINTS DE POURCENTAGE de la base de chaque
  // palier. DOIT rester strictement sous `raid.levelHpBonusPct` : au-dessus,
  // les lots croissent plus vite que les PV et monter en difficulté devient
  // un farm plus rentable. L'invariant est gardé par un test unitaire.
  'raid.levelRewardPct': 5,
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
  // La base a fait l'aller-retour 175 -> 1050 -> 210, et ce n'est pas une
  // hesitation : entre les deux, le nombre de niveaux UTILES a double. La
  // progression s'arrete quand l'arbre est plein, et l'arbre est passe de 17
  // a 32 rangs — donc du niveau 18 au niveau 33. A 1050, atteindre 33 aurait
  // coute cinq fois le trajet qu'on venait de caler.
  //
  // 210 rend au parcours complet son cout d'avant : ~690 000 XP, soit 17
  // semaines pour une equipe de 35 membres actifs, 50 pour une de 12, 121
  // pour une de 5. Le meme temps, reparti sur deux fois plus de paliers.
  //
  // C'est le TOTAL qui est cale, jamais le cout d'un niveau isole : ajouter
  // ou retirer des rangs a l'arbre deplace le dernier niveau utile, donc
  // cette base. Les deux se relisent ensemble.
  'teamLevel.xpBase': 210,
  'teamLevel.xpExp': 1.6,
  // Le plafond vaut EXACTEMENT la capacite de l'arbre plus un : 32 rangs
  // (10 + 2 + 10 + 10) pour 32 points distribues du niveau 1 au niveau 33.
  // Aucun niveau mort, aucun rang hors d'atteinte. Les faire diverger ramene
  // l'un des deux defauts precedents — soit des points indepensables, soit
  // des rangs qu'on ne peut jamais atteindre.
  'teamLevel.maxLevel': 33,
  // Dix rangs plutot que cinq, a l'effet par rang divise par deux : le
  // plafond de chaque bonus est INCHANGE, il s'atteint seulement par paliers
  // deux fois plus fins. C'est ce qui donne un arbitrage a chaque point
  // plutot qu'une case a cocher.
  //
  // `loot` est un POURCENTAGE, pas des minutes : il divise l'intervalle de
  // regeneration (`effectiveRegenInterval`, economy.domain.ts).
  //
  // Passe de 0,25 a 1 par rang, soit +10 % au plafond au lieu de +2,5 %.
  // L'ancienne valeur ne se sentait tout simplement pas : l'intervalle de
  // base est de 60 minutes, donc 24 jetons par jour, et +2,5 % en ajoutait
  // 0,6 — quatre par semaine. A +10 % le membre gagne 2,4 jetons par jour,
  // dix-sept sur la semaine.
  //
  // L'ordre de grandeur reste sous celui du bonus de raid (+1 attaque sur 2,
  // donc +50 %) et au-dessus de `xp` (+4 %) et `forge` (-5 %). C'est voulu :
  // `loot` touche la boucle centrale du jeu, c'est le bonus que chaque membre
  // ressent tous les jours.
  'teamPerk.loot.perRank': 1,
  'teamPerk.loot.unlockLevel': 1,
  'teamPerk.loot.maxRank': 10,
  // `raid.maxRank` a ete ramene de 5 a 2. A 5, le bonus donnait +2 attaques
  // par jour sur les 2 de base : la capacite hebdomadaire d'une equipe de 35
  // passait de 7,2 a 14,4 M de degats contre 5,67 M de PV, soit un boss tombe
  // au 3e jour au lieu du 6e. A 2 il donne +1 attaque, x1,5 au lieu de x2.
  // `perRank` a 0,5 avec le plancher entier de `perkEffect` veut dire une
  // attaque tous les DEUX rangs : le rang 1 ne change encore rien, le rang 2
  // donne l'attaque.
  'teamPerk.raid.perRank': 0.5,
  // Ouvert des le premier niveau, comme les trois autres : un deblocage
  // tardif decidait de l'ordre a la place du chef, et les premiers points
  // n'avaient alors aucun arbitrage.
  'teamPerk.raid.unlockLevel': 1,
  // Seul bonus qui reste a 2 rangs : son effet est un NOMBRE D'ATTAQUES, un
  // entier, qui ne se decoupe pas en paliers plus fins. Le plafond a 2 vient
  // de l'equilibrage du raid (voir plus haut), pas de la taille de l'arbre.
  'teamPerk.raid.maxRank': 2,
  'teamPerk.xp.perRank': 0.4,
  'teamPerk.xp.unlockLevel': 1,
  'teamPerk.xp.maxRank': 10,
  'teamPerk.forge.perRank': 0.5,
  'teamPerk.forge.unlockLevel': 1,
  'teamPerk.forge.maxRank': 10,
  'team.maxMembers': 35,
  'team.recruitDays': 1,
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
