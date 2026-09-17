// changelog-sync: dernier commit intégré au changelog. Mis à jour par la commande /changelog.
// last-synced-commit: f86bba614378019d4c0fce4fa098091b7ede28de
import { createFileRoute } from '@tanstack/react-router'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { cn } from '../libs/utils.ts'

type ChangeType = 'new' | 'improved' | 'fixed'

type ChangelogEntry = {
  type: ChangeType
  text: string
}

type ChangelogRelease = {
  version: string
  title: string
  date: string
  summary: string
  entries: ChangelogEntry[]
}

const TYPE_META: Record<ChangeType, { label: string; className: string }> = {
  new: {
    label: 'Nouveau',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  improved: {
    label: 'Amélioré',
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  fixed: {
    label: 'Corrigé',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
}

const RELEASES: ChangelogRelease[] = [
  {
    version: '3.2',
    title: 'Chaque mode garde son équipe',
    date: 'Septembre 2026',
    summary:
      'Une équipe pour la tour de Braise, une autre pour celle de Prisme, une troisième pour la campagne — chacune t’attend là où tu l’as laissée. Et les monstres des tours ont enfin un visage.',
    entries: [
      {
        type: 'new',
        text: 'La campagne, chacune des quatre tours et le raid ont désormais leur propre équipe. Tu montes une composition contre le feu, tu passes à la tour de Prisme, tu reviens : ta composition anti-feu est toujours là. Plus rien à recomposer à chaque aller-retour. Tant que tu n’as pas touché à un écran, il joue ton équipe de campagne — un nouveau venu n’a donc qu’une équipe à faire, et elle sert partout. Dès que tu modifies celle d’une tour, cette tour devient indépendante et la campagne ne la fait plus bouger ; le bouton « Revenir à l’équipe de campagne », dans l’éditeur, défait ce choix quand tu veux. La liste des tours affiche les trois cartes que chacune emmène, et ton équipe actuelle a été reprise telle quelle : tu ne repars pas de zéro.',
      },
      {
        type: 'fixed',
        text: 'Les monstres des tours ont enfin un visage. Les 120 ennemis des quarante étages s’affichaient avec une image manquante et s’appelaient tous « Ennemi 1 », en préparation comme en combat. Chaque tour puise maintenant dans les familles de son élément — élémentaires, minotaures, wyvernes et kobolds pour Braise, basilics pour Monolithe — sans jamais répéter deux fois le même sprite dans un étage. Le contre-pick reste donc lisible : une tour, un élément à contrer.',
      },
      {
        type: 'improved',
        text: 'Le classement de puissance se lit sur ton équipe de campagne. Avec six équipes possibles, il fallait en désigner une : c’est celle-là qui te représente. Si tu ne soignes que tes équipes de tour, pense à garder une campagne à jour.',
      },
    ],
  },
  {
    version: '3.1',
    title: 'Rejouer sans y passer la soirée',
    date: 'Septembre 2026',
    summary:
      'Un étage déjà battu se relance cinq fois d’un clic, l’équipement se lit d’un coup d’œil, le vœu porte plusieurs cartes — et la courbe de niveau redevient une courbe.',
    entries: [
      {
        type: 'new',
        text: 'Le combat multiple remplace « Balayer » : un niveau de campagne déjà terminé ne propose plus qu’un bouton, avec ses segments ×1 et ×5 qui affichent chacun leur coût en énergie — le prix montré est celui qui sera débité. Les tours y ont droit à leur tour : un étage franchi se rejoue en série, chaque passage garantit une pièce, et le tarif est le même qu’en campagne.',
      },
      {
        type: 'new',
        text: 'Le vœu porte désormais plusieurs cartes — deux emplacements au départ, jusqu’à cinq avec la compétence « Collectionneur » — et le délai de sept jours entre deux achats disparaît. En échange, le prix redevient le vrai frein : les remises de boutique ne s’appliquent plus au vœu, et elles passent de 25 à 18 %. Les points investis dans l’ancien « Négociant » te sont rendus.',
      },
      {
        type: 'improved',
        text: 'L’écran de récompenses encaisse enfin les gros butins : les pièces défilent sur une rangée, les cartes sur une autre, toutes les fiches à la même hauteur, et « Continuer » reste à portée de pouce. La carte gagnée s’affiche nue, avec la même pastille « Nouveau » qu’au tirage.',
      },
      {
        type: 'improved',
        text: 'L’équipement se lit sans ouvrir trois écrans : chaque ligne du sélecteur annonce son set, la fiche montre l’avancement du set sur cette carte-là, les tuiles portent la rareté par leur dégradé et affichent « n / 7 équipées » plus l’apport total en stats. La fenêtre d’un emplacement s’ouvre directement sur la pièce portée, les bonus parlent en ATQ et VIT au lieu de ATK et SPD, et les valeurs de stat sont des nombres entiers.',
      },
      {
        type: 'improved',
        text: 'Le set « Précision » s’appelle désormais « Affût », et il s’active à trois pièces au lieu de quatre. Son ancien nom promettait de la justesse alors qu’il donne du taux de critique, et il était déjà celui d’un passif de combat. Surtout, à quatre pièces le build critique complet était impossible : Fureur et lui réclamaient huit emplacements pour sept. Fureur (4) et Affût (3) tiennent maintenant pile sur la même carte — dégâts critiques et taux de critique enfin ensemble. Le bonus, lui, ne change pas, pas plus que les noms de tes pièces.',
      },
      {
        type: 'improved',
        text: 'Gros coup de règle sur l’équilibrage. La courbe de niveau joueur est multipliée par cinq et l’XP de premier passage divisée par trois : monter au niveau 30 ne tient plus dans une journée. L’arbre de compétences coûte maintenant 109 points — exactement ce qu’un niveau 100 possède — donc plus aucun nœud n’est un sacrifice obligé ; la branche Collection devient enfin désirable (recyclage +30 %, et elle s’ouvre désormais sur ses meilleurs nœuds), les nœuds de butin de Combat redescendent d’un tiers, et le bonus de butin ne gonfle plus la chance de carte, seulement celle d’équipement. « Opulence » ne double plus le plafond d’achat de packs d’énergie : elle le porte à cinq par jour au lieu de six. Enfin, la vitesse ne se tire plus qu’en valeur plate : les pièces qui portaient du % VIT ont été retirées au profit d’une autre sous-stat.',
      },
      {
        type: 'fixed',
        text: 'Avec la compétence « Opulence », la boutique annonçait « Limite atteinte » dès trois packs d’énergie alors que la compétence en autorisait davantage. Côté campagne, la carte gagnée manquait à l’appel en fin de combat et le résultat d’un balayage n’affichait pas les mêmes fiches qu’une victoire. La fiche de pièce ne s’écrase plus dans les récompenses de tour, la grille d’équipement ne se réordonne plus quand tu améliores une pièce, et deux nœuds de l’arbre ne se chevauchent plus.',
      },
    ],
  },
  {
    version: '3.0',
    title: 'Les équipes prennent vie',
    date: 'Septembre 2026',
    summary:
      'Un boss à abattre en groupe chaque semaine, des duels et des paris entre coéquipiers, une progression d’équipe à faire monter — et un annuaire pour trouver les tiens.',
    entries: [
      {
        type: 'new',
        text: 'Le raid d’équipe : chaque semaine, un boss élémentaire se dresse devant ton équipe — Ignis le Brasier, Nérée la Marée, Sylva la Ronce ou Gorm le Roc — et la rotation change de boss d’une semaine à l’autre. Tout le monde tape sur la même barre de points de vie, deux attaques par jour et par membre, et l’équipe décroche un lot à 25, 50, 75 et 100 % de la barre. La page d’équipe suit les dégâts en direct et montre qui a contribué combien.',
      },
      {
        type: 'new',
        text: 'Les duels de tirage : défie un coéquipier sur vos cinq prochains tirages, chacun engage des cartes, et le meilleur score rafle la mise. Les cartes engagées sont verrouillées le temps du duel — impossible de les recycler en douce. Tu as 24 h pour accepter, 48 h pour tirer.',
      },
      {
        type: 'new',
        text: 'Les paris : ouvre un marché sur les dix prochains tirages d’un coéquipier — « est-ce qu’il sortira au moins un rare ? » — et mise ta poussière. Les autres renchérissent du camp qu’ils veulent et la cote bouge à chaque mise, calculée sur les vraies chances de la table de tirage. Avant de choisir ton camp, tu vois qui a misé de l’autre côté, et combien.',
      },
      {
        type: 'new',
        text: 'La progression d’équipe : tes dégâts de raid, tes duels gagnés, tes paris gagnés et tes tirages rapportent des points chaque semaine, et leur somme fait monter l’équipe de niveau. Chaque niveau donne un point que le chef investit dans l’un des quatre bonus — régénération de jetons, attaques de raid, XP de campagne, coût de reforge — répartis sur 32 rangs, les quatre ouverts dès le premier point.',
      },
      {
        type: 'new',
        text: 'Le recrutement : un annuaire des équipes qui cherchent du monde s’ouvre depuis « Mes équipes ». Tu peux candidater à cinq équipes à la fois, suivre tes candidatures et les annuler ; côté chef, une file d’attente affiche le niveau de chaque candidat, et la cloche prévient des deux côtés. Une candidature expire au bout de sept jours, et un refus t’écarte de cette équipe une semaine.',
      },
      {
        type: 'improved',
        text: 'Les deux écrans d’équipe sont refaits : la liste avec ses emblèmes colorés et ses emplacements libres, la fiche en deux colonnes avec le raid, les duels et la table des contributions. Le grade d’officier devient enfin attribuable par le chef, et l’étiquette « Recrue » ne tient plus qu’un jour au lieu d’une semaine.',
      },
    ],
  },
  {
    version: '2.1',
    title: 'Cartes, compétences et réglages',
    date: 'Septembre 2026',
    summary:
      'Cinq familles de cartes de plus, un arbre de compétences qui va jusqu’au niveau 100, des quêtes d’équipement et un combat recalibré.',
    entries: [
      {
        type: 'new',
        text: 'Cinq familles rejoignent le classeur — Centaures, Dryades, Kitsunes, Draenei et Lamia — soit 170 cartes de plus. Le jeu compte désormais 18 familles et 602 cartes, dont les illustrations sont servies à la taille de ton écran et chargent donc plus vite.',
      },
      {
        type: 'new',
        text: 'L’arbre de compétences couvre enfin le niveau 100 : les nœuds existants gagnent des paliers, et de nouveaux sommets apparaissent, dont deux qui touchent l’équipement — une remise sur le coût d’amélioration et un bonus au recyclage. Plus aucun effet n’est réparti sur deux nœuds d’une même branche : monter une compétence ne peut plus être un piège.',
      },
      {
        type: 'new',
        text: 'Des quêtes d’équipement entrent dans la rotation : le pool hebdomadaire passe de 7 à 11 quêtes, et la chaîne à faire une fois gagne les trois gestes de découverte — ramasser, améliorer et recycler une pièce. Environ quatre semaines sur cinq contiennent au moins une quête d’équipement.',
      },
      {
        type: 'new',
        text: 'Un guide des éléments s’ouvre depuis l’en-tête de la campagne et des tours : la roue des quatre éléments, la paire Lumière / Ténèbres qui se répond hors cycle, et les multiplicateurs exacts.',
      },
      {
        type: 'improved',
        text: 'Le combat est recalibré. La vitesse ne monte plus avec le niveau — ni chez toi ni chez l’ennemi : c’est l’équipement qui décide de l’ordre des tours. Les autres stats gagnent 9 % par niveau au lieu de 6 %. Et les débuts redeviennent franchissables : le premier étage de tour et le premier combat de campagne se gagnent de nouveau avec une main de départ médiocre.',
      },
      {
        type: 'fixed',
        text: 'Le compteur de garantie annonçait le légendaire un tirage trop tôt. Et la vue agrandie d’une carte est désormais la même partout — tirage, collection, butin de duel — y compris ouverte depuis une fenêtre.',
      },
    ],
  },
  {
    version: '2.0',
    title: 'Les Tours et l’Équipement',
    date: 'Septembre 2026',
    summary:
      'Quatre tours élémentaires à gravir, et de quoi équiper tes cartes de pied en cap : sept emplacements, des sets à composer et des sous-stats à chasser.',
    entries: [
      {
        type: 'new',
        text: 'Les Tours élémentaires : quatre tours de dix étages — Feu, Eau, Nature et Terre. Chaque tour alimente un emplacement précis (les gants au Feu, les bottes à l’Eau, l’amulette à la Nature, la ceinture à la Terre), donc tu montes celle qui lâche la pièce qui te manque. Chaque passage garantit une pièce, et plus tu grimpes, plus elle sort rare.',
      },
      {
        type: 'new',
        text: 'L’équipement : chaque carte porte sept pièces — arme, armure, anneau, amulette, gants, bottes, ceinture. Une pièce a une stat principale et jusqu’à quatre sous-stats, et monte jusqu’au niveau 12 : tous les trois niveaux, une sous-stat apparaît ou se renforce.',
      },
      {
        type: 'new',
        text: 'Les sets : sept sets, mais tous n’ont pas la même taille. Célérité et Colosse s’activent à deux pièces, Affût, Assaut et Percée à trois, Fureur et Sangsue à quatre — de quoi en porter deux à la fois sur une même carte. Attention : le compte se fait carte par carte, pas sur ton inventaire. Le bouton « Bonus de sets » récapitule tout.',
      },
      {
        type: 'new',
        text: 'Deux pièces du même emplacement ne se valent plus : une armure peut sortir en DÉF, en PV, en % DÉF ou en % PV. Il y a désormais une bonne version d’une pièce à chercher, pas seulement une bonne rareté.',
      },
      {
        type: 'improved',
        text: 'Ton inventaire d’équipement se trie et se filtre : par rareté, niveau, emplacement, set ou stat principale. Tu peux sélectionner plusieurs pièces d’un coup pour les vendre — avec une confirmation si un légendaire traîne dans le lot.',
      },
      {
        type: 'improved',
        text: 'Le butin de campagne suit enfin ta progression : les communes dominent aux premiers étages puis s’éteignent complètement en fin de campagne, pendant que les hautes raretés montent. Un premier passage garantit une pièce sur presque tous les étages, et les boss gardent une longueur d’avance.',
      },
    ],
  },
  {
    version: '1.9',
    title: 'Le combat s’étoffe',
    date: 'Août – Septembre 2026',
    summary:
      'Coups critiques, pénétration d’armure, vol de vie — et des passifs qui réagissent vraiment à ce qui se passe sous tes yeux.',
    entries: [
      {
        type: 'new',
        text: 'Quatre stats de combat font leur entrée : taux critique, dégâts critiques, pénétration d’armure et vol de vie. Elles ne viennent que de l’équipement — c’est lui qui décide du style de ta carte.',
      },
      {
        type: 'improved',
        text: 'Les passifs ne se contentent plus d’un bonus fixe : ils réagissent au déroulé du combat. Vigueur annule un coup fatal, Fortification empile à chaque coup encaissé, Vampirisme double son soin sous la moitié des points de vie, et Hâte comme Exaltation se déclenchent en cours de route.',
      },
      {
        type: 'improved',
        text: 'Les combats vont deux fois plus vite. Les cartes encaissent moins et frappent plus fort : fini les échanges interminables où personne ne tombait.',
      },
      {
        type: 'fixed',
        text: 'Les soins s’affichent dans le déroulé du combat — le vol de vie et les passifs de régénération se voyaient sur les points de vie, mais pas dans le journal.',
      },
    ],
  },
  {
    version: '1.7',
    title: 'Neuf chapitres et palier 7',
    date: 'Août 2026',
    summary:
      'La campagne s’étend jusqu’au chapitre 9, tes cartes montent un palier de plus, et les boss reprennent leur rôle de vrai test de fin de chapitre.',
    entries: [
      {
        type: 'new',
        text: 'Quatre nouveaux chapitres : Volcan, Toundra, Abysses et Faille. La campagne compte désormais 9 chapitres et 90 étages.',
      },
      {
        type: 'new',
        text: 'Palier d’ascension 7 débloqué : tes cartes peuvent grimper jusqu’au niveau 70.',
      },
      {
        type: 'improved',
        text: 'Difficulté revue en profondeur : la montée en puissance des ennemis est désormais continue d’un bout à l’autre de la campagne, et le boss redevient le vrai pic de chaque chapitre — le vrai check de ta build.',
      },
      {
        type: 'new',
        text: 'De nouveaux succès marquent les jalons des chapitres 5, 7 et 9, alignés sur le plafond de niveau 70.',
      },
    ],
  },
  {
    version: '1.6',
    title: 'Éléments & tirage',
    date: 'Juillet – Août 2026',
    summary:
      'Tes cartes ont un élément, tes adversaires aussi — et le tirage se vit en grand.',
    entries: [
      {
        type: 'new',
        text: 'Éléments : chaque carte et chaque monstre appartient à un élément. Le feu brûle la nature, la nature fissure la terre, la terre absorbe l’eau, l’eau éteint le feu — et lumière et ténèbres se répondent. Attaquer avec l’avantage fait mal ; l’encaisser fait moins mal.',
      },
      {
        type: 'new',
        text: 'Ciblage élémentaire : au combat, chaque unité frappe en priorité l’adversaire qu’elle domine. Les éléments ennemis sont affichés avant de lancer l’assaut — à toi de composer ton équipe en conséquence.',
      },
      {
        type: 'improved',
        text: 'Campagne recalibrée pour tenir compte des éléments, et pastilles d’élément visibles sur les portraits comme sur l’aperçu des adversaires.',
      },
      {
        type: 'new',
        text: 'Tirage repensé : la capsule vibre en crescendo puis explose, la machine s’anime, le son suit. Le tirage x10 se dépile carte par carte, avec un bouton Passer si tu es pressé.',
      },
      {
        type: 'new',
        text: 'Un tutoriel en six étapes t’accueille sur la page de tirage, et ton énergie se remplit à bloc à chaque montée de niveau.',
      },
      {
        type: 'improved',
        text: 'Boutique rééquilibrée (packs de jetons, recharges, boutique du jour), stockage de jetons de base porté à 10, et affichage des ressources uniformisé partout.',
      },
    ],
  },
  {
    version: '1.5',
    title: 'Équipement, combat & campagne',
    date: 'Juillet 2026',
    summary:
      'Ton équipement progresse, le combat gagne en profondeur et la campagne s’agrandit.',
    entries: [
      {
        type: 'new',
        text: 'Progression d’équipement : améliore tes pièces jusqu’au niveau 12, sous-stats selon la rareté, et destruction en masse contre de l’or.',
      },
      {
        type: 'improved',
        text: 'Combat repensé : chaque carte agit selon sa vitesse (jauge d’action) et les attaques touchent des cibles aléatoires.',
      },
      {
        type: 'new',
        text: 'Campagne enrichie : chapitres 4 et 5, ennemis avec portraits et familles aux passifs uniques (poison, brûlure, bénédiction…).',
      },
      {
        type: 'improved',
        text: 'Collection : puissance affichée sur tes cartes, tri et filtres mémorisés, et recyclage des doublons en masse.',
      },
      {
        type: 'new',
        text: 'Boutique : packs d’énergie pour la campagne et boosts de tirage cumulables.',
      },
      {
        type: 'improved',
        text: 'Révélations plus spectaculaires : animations dédiées aux variantes Brillante et Holo, et inspection de la carte au clic.',
      },
    ],
  },
  {
    version: '1.4',
    title: 'Quêtes, souhaits & économie',
    date: 'Juillet 2026',
    summary:
      'De nouveaux objectifs quotidiens, une liste de souhaits et une économie remise à plat.',
    entries: [
      {
        type: 'new',
        text: 'Quêtes quotidiennes et hebdomadaires avec récompenses à réclamer.',
      },
      {
        type: 'new',
        text: 'Liste de souhaits : marque les cartes que tu convoites sur ton profil.',
      },
      {
        type: 'new',
        text: 'Page de statistiques publique pour suivre l’activité de la communauté.',
      },
      {
        type: 'improved',
        text: 'Refonte de l’économie : jetons, poussière et pitié rééquilibrés.',
      },
      {
        type: 'improved',
        text: 'Écran de tirage et de révélation affiné.',
      },
    ],
  },
  {
    version: '1.3',
    title: 'Combat & progression',
    date: 'Juin 2026',
    summary:
      'Le PvE arrive : succès, campagne, batailles et équipement pour tes cartes.',
    entries: [
      {
        type: 'new',
        text: 'Système de succès : débloque des récompenses en jouant.',
      },
      { type: 'new', text: 'Combat et batailles contre des adversaires.' },
      { type: 'new', text: 'Mode campagne avec une progression par étapes.' },
      { type: 'new', text: 'Équipement pour renforcer tes cartes au combat.' },
    ],
  },
  {
    version: '1.2',
    title: 'Compétences & classements',
    date: 'Avril – Mai 2026',
    summary: 'Personnalise ton style de jeu et grimpe dans les classements.',
    entries: [
      {
        type: 'new',
        text: 'Arbre de compétences pour faire évoluer ton profil de joueur.',
      },
      {
        type: 'new',
        text: 'Boutique quotidienne avec une sélection renouvelée chaque jour.',
      },
      {
        type: 'new',
        text: 'Classements repensés avec un système de score global.',
      },
      {
        type: 'improved',
        text: 'Révélation des cartes retravaillée avec des effets propres à chaque rareté.',
      },
    ],
  },
  {
    version: '1.1',
    title: 'Profils & récompenses',
    date: 'Mars 2026',
    summary:
      'Ta vitrine personnelle et de quoi être récompensé pour ta régularité.',
    entries: [
      {
        type: 'new',
        text: 'Pages de profil publiques pour montrer ta collection.',
      },
      {
        type: 'new',
        text: 'Séries de connexion (streak) et paliers de récompenses.',
      },
      { type: 'new', text: 'Recyclage des cartes en double en poussière.' },
      {
        type: 'new',
        text: 'Améliorations permanentes (gain de jetons, chance, récolte de poussière…).',
      },
      {
        type: 'new',
        text: 'Flux en direct des tirages de toute la communauté.',
      },
    ],
  },
  {
    version: '1.0',
    title: 'Le lancement',
    date: 'Mars 2026',
    summary:
      'La première version de Gachapon : joue, collectionne, rejoins une équipe.',
    entries: [
      {
        type: 'new',
        text: 'Machines 3D à pince et à capsule pour tes tirages.',
      },
      {
        type: 'new',
        text: 'Collection de cartes TCG avec variantes Holo et Brillante.',
      },
      { type: 'new', text: 'Comptes par e-mail ou via Google et Discord.' },
      {
        type: 'new',
        text: 'Équipes, invitations et classements entre membres.',
      },
      {
        type: 'new',
        text: 'Backoffice d’administration pour gérer cartes, sets et médias.',
      },
    ],
  },
]

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/changelog" />
      <LandingNavbar />
      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          Mises à jour
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-4">Changelog</h1>
        <p className="text-text-light text-base leading-relaxed mb-16 max-w-xl">
          Tout ce qui a changé dans Gachapon, de la première capsule aux
          dernières nouveautés.
        </p>

        <div className="relative">
          <div
            className="absolute left-0 top-2 bottom-2 w-px bg-border"
            aria-hidden
          />
          <ol className="space-y-14">
            {RELEASES.map((release) => (
              <li key={release.version} className="relative pl-8">
                <span
                  className="absolute left-0 top-1.5 -translate-x-1/2 h-3 w-3 rounded-full bg-primary ring-4 ring-background"
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                  <span className="inline-flex items-center rounded-full bg-card border border-border px-2.5 py-0.5 text-xs font-bold tracking-wide">
                    v{release.version}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight">
                    {release.title}
                  </h2>
                </div>
                <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-3">
                  {release.date}
                </p>
                <p className="text-text-light text-sm leading-relaxed mb-5">
                  {release.summary}
                </p>
                <ul className="space-y-2.5">
                  {release.entries.map((entry) => (
                    <li key={entry.text} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          TYPE_META[entry.type].className,
                        )}
                      >
                        {TYPE_META[entry.type].label}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {entry.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  )
}
