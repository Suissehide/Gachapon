/**
 * Anciennes traductions anglaises livrées par le code, puis remplacées.
 *
 * `ContentTranslationsBootstrap` ne réécrit jamais une colonne anglaise qui
 * diffère du français : c'est sa seule façon de reconnaître une traduction
 * saisie à la main par un administrateur. Une traduction que le CODE a
 * posée puis corrigée ressemble pourtant exactement à ça — « Léna the
 * Archer » n'est ni vide ni égal à « Léna l'Archère ». Sans cette liste, la
 * correction n'atteindrait jamais la production, où le déploiement ne
 * rejoue pas les seeds.
 *
 * Une valeur listée ici redevient réécrivable : on sait qu'elle vient du
 * code, pas d'un humain. (Un administrateur qui aurait retapé exactement la
 * même chaîne serait écrasé aussi — il aurait tapé la valeur fautive.)
 *
 * Portée : un ensemble de VALEURS, comme `deliberateIdenticalValues`. Seules
 * y figurent les traductions qui différaient du français ; celles qui le
 * recopiaient (« Fougère », « Nérée ») sont déjà réécrivables.
 *
 * Ne jamais retirer une entrée : une base restaurée d'une sauvegarde
 * ancienne peut encore la porter.
 */
export const RETIRED_ENGLISH_NAMES: ReadonlySet<string> = new Set([
  // 2026-09-28 — accents français retirés de l'anglais.
  'Léna the Archer',
  'Séléné of the Whip',
  'Captain Hélène',
  'Séraphine the Sorceress',
  'Naïa the Druid',
  'Azraël the Fallen',
  'Séraphine, Queen of Angels',
  'Aurélion the Astral',
  'Néphra the Reader',
  'Protée the Lancer',
  'Mélicerte the Ranger',
  'Thétys the Abyssal Witch',
  'Océanos, Bulwark of the Reefs',
  'Galatée the Huntress',
  'Rosée the Swordswoman',
  'Primevère the Fairy',
  'Genièvre the Bramble',
  'Solène the Dawn',
  'Bruyère the Archer',
  'Pholoé the Tracker',
  'Nephélé, Daughter of the Clouds',
  'Hippé the Astronomer',
  'Chênaie the Guardian',
  'Térébinthe the Blossoming',
  'Nérée, the Tide',
])
