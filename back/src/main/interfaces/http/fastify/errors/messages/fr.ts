/**
 * Catalogue français des messages d'erreur — texte de code, pas contenu de
 * jeu. Sert de référentiel de clés pour `ErrorMessageKey` (voir `keys.ts`) :
 * toute clé ajoutée ici doit recevoir sa traduction dans `en.ts`, sous peine
 * d'échec de compilation.
 *
 * Convention de nommage : `<domaine>.<sujet>`, jamais le texte du message
 * (voir task-6-brief.md). Un message identique dans deux endroits du code
 * partage la même clé ; deux messages qui se ressemblent mais signalent des
 * échecs différents reçoivent des clés distinctes.
 */
export const FR_MESSAGES = {
  'user.notFound': 'Utilisateur introuvable',
  'user.usernameTaken': 'Ce pseudo est déjà pris',
  'team.maxTeamsPerUser': 'Maximum {{max}} équipes par utilisateur',

  // --- auth ---
  'auth.emailAlreadyInUse': 'Email déjà utilisé',
  'auth.unverifiedAccountPending':
    'Un compte est en attente de vérification pour cet email',
  'auth.invalidCredentials': 'Identifiants invalides',
  // Code technique lu par le front (voir front/src/api/auth.api.ts), pas un
  // message affiché — identique dans les deux langues, comme tout sentinel.
  'auth.emailNotVerified': 'EMAIL_NOT_VERIFIED',
  'auth.invalidOrExpiredToken': 'Token invalide ou expiré',
  'auth.invalidOrExpiredRefreshToken':
    'Jeton de rafraîchissement invalide ou expiré',
  'auth.refreshTokenRevoked': 'Le jeton de rafraîchissement a été révoqué',
  'auth.resendCooldown': 'Veuillez patienter avant de renvoyer un email',
  'auth.unknownProvider': 'Fournisseur inconnu',
  'auth.oauthTokenExchangeFailed':
    'Échec de l’échange du jeton auprès du fournisseur OAuth',
  'auth.oauthUserinfoFailed':
    'Échec de récupération du profil auprès du fournisseur OAuth',
  'auth.invalidApiKey': 'Clé API invalide',
  'auth.accountSuspended': 'Compte suspendu',
  'auth.noAccessToken': 'Aucun jeton d’accès',
  'auth.notAuthenticated': 'Non authentifié',
  'auth.insufficientPermissions': 'Permissions insuffisantes',
  'auth.noRefreshToken': 'Aucun jeton de rafraîchissement',
  'auth.oauthMissingCodeOrState': 'Code ou état manquant',
  'auth.oauthInvalidState': 'État OAuth invalide',

  // --- profile / admin users ---
  'profile.cardNotInCollection': 'Cette carte n’est pas dans ta collection',
  'admin.cannotChangeOwnRole': 'Impossible de modifier son propre rôle',
  'admin.cannotSuspendSelf': 'Impossible de suspendre son propre compte',

  // --- collection / cartes ---
  'collection.cardNotFound': 'Carte introuvable',
  'collection.cardNotOwned': 'Tu ne possèdes pas cette carte',
  'collection.userCardNotFound': 'Carte du joueur introuvable',
  'cardAscension.maxPalierReached': 'Carte déjà au palier maximum ({{max}})',
  'cardAscension.notTopOfPalier':
    'La carte doit être au sommet de son palier (niveau {{requiredLevel}}) pour évoluer — niveau actuel {{currentLevel}}',
  'cardAscension.needDuplicate':
    'Il faut au moins 1 exemplaire en double (quantité > 1) pour évoluer — quantité actuelle {{quantity}}',
  'cardDust.amountTooLow': 'La quantité doit être d’au moins 1',
  'cardDust.wouldLeaveZeroCopies':
    'Impossible de convertir {{amount}} — il resterait 0 exemplaire (tu en as {{quantity}})',
  'cardLeveling.targetBelowCurrent':
    'Le niveau visé ({{target}}) doit être supérieur au niveau actuel ({{current}})',
  'cardLeveling.targetExceedsPalierCap':
    'Le niveau visé ({{target}}) dépasse le plafond du palier ({{cap}}) — fais évoluer la carte pour débloquer le palier suivant',
  'cardLeveling.notEnoughGold':
    'Or insuffisant (besoin de {{need}}, tu as {{have}})',
  'cardLeveling.notEnoughDust':
    'Poussière insuffisante (besoin de {{need}}, tu as {{have}})',
  'media.imageMustBeJpegPngWebp':
    'L’image doit être au format jpeg, png ou webp',
  'media.imageTooLarge': 'Image trop volumineuse (5 Mo max)',
  'cards.imageOrUrlRequired': 'Un fichier image ou une URL d’image est requis',
  'cards.noImageProvided': 'Aucune image fournie',

  // --- gacha ---
  'gacha.noActiveCards': 'Aucune carte active dans un set',
  'gacha.notEnoughTokens': 'Jetons insuffisants',

  // --- shop / daily-shop / wishlist ---
  'shop.itemNotFound': 'Article introuvable',
  'economy.notEnoughGold': "Pas assez d'or",
  'economy.notEnoughDust': 'Poussière insuffisante',
  'shop.machineAlreadyOwned': 'Machine déjà possédée',
  'shop.energyDailyCapReached':
    "Limite quotidienne d'achats d'énergie atteinte",
  'shop.boostMissingEffect':
    'La valeur du BOOST n’a ni multiplicateur ni rareté garantie',
  'shop.boostMissingPulls':
    'La valeur du BOOST n’a pas de nombre de tirages positif',
  'shop.boostRarityConflict':
    'Un boost différent est déjà actif sur cette rareté',
  'shop.boostGuaranteeConflict': 'Un boost de ce type est déjà actif',
  'shop.boostInvalidRarity':
    'La valeur du BOOST a une rareté invalide : {{rarity}}',
  'shop.energyPackMissingCombatPoints':
    'La valeur de l’ENERGY_PACK n’a pas d’entier positif de points de combat',
  'dailyShop.notEnoughActiveCards':
    'Pas assez de cartes actives pour générer la boutique du jour',
  'dailyShop.itemAlreadyPurchased': 'Article déjà acheté',
  'wishlist.cardNotFoundOrInactive': 'Carte introuvable ou set inactif',
  'wishlist.full': 'Wishlist pleine ({{slots}} emplacements)',
  'wishlist.cardNotInWishlist':
    'Cette carte n’est pas dans ta liste de souhaits',
  'shop.shopItemNotFound': 'Article de boutique introuvable',

  // --- team ---
  'team.notFound': 'Équipe introuvable',
  'team.notMember': 'Tu ne fais pas partie de cette équipe',
  'team.full': 'Cette équipe est complète ({{max}} membres)',
  'team.userAlreadyMember': 'Cet utilisateur est déjà membre',
  'team.invitationAlreadyPendingForUser':
    'Une invitation est déjà en attente pour cet utilisateur',
  'team.invitationAlreadyPendingForEmail':
    'Une invitation est déjà en attente pour cet email',
  'team.provideEmailOrUsername': 'Indique un email ou un pseudo',
  'team.onlyAdminOrOwnerCanInvite':
    'Seuls ADMIN ou OWNER peuvent inviter des membres',
  'team.invitationForAnotherUser':
    'Cette invitation est pour un autre utilisateur',
  'team.invitationNotFound': 'Invitation introuvable',
  'team.invitationAlreadyProcessed': 'Invitation déjà traitée',
  'team.invitationExpired': 'Invitation expirée',
  'team.alreadyMemberOfTeam': 'Déjà membre de cette équipe',
  'team.memberNotFound': 'Membre introuvable',
  'team.cannotRemoveOwner': 'Impossible de retirer le chef',
  'team.adminCannotRemoveAdmin': 'Un ADMIN ne peut pas retirer un autre ADMIN',
  'team.ownerMustTransferBeforeLeaving':
    'Le chef doit transférer la propriété avant de partir',
  'team.onlyOwnerCanChangeRoles':
    'Seul le chef peut modifier les rôles des membres',
  'team.useOwnershipTransferForOwnerRole':
    'Utilise le transfert de propriété pour changer le rôle du chef',
  'team.onlyOwnerCanTransferOwnership':
    'Seul le chef peut transférer la propriété',
  'team.newOwnerMustBeMember': 'Le nouveau chef doit être membre de l’équipe',
  'team.onlyOwnerCanUpdateTeam': 'Seul le chef peut modifier l’équipe',
  'team.onlyOwnerCanDeleteTeam': 'Seul le chef peut supprimer l’équipe',
  'team.invitationNotFoundOrNotPending':
    'Invitation introuvable ou déjà traitée',
  'team.onlyAdminOrOwnerCanResendInvitations':
    'Seuls ADMIN ou OWNER peuvent renvoyer des invitations',
  'team.cooldownActive': 'Cooldown actif',
  'team.noRecipientEmail': 'Aucun email destinataire trouvé',
  'team.pendingWagers.betSingular': '{{count}} pari',
  'team.pendingWagers.betPlural': '{{count}} paris',
  'team.pendingWagers.duelSingular': '{{count}} duel',
  'team.pendingWagers.duelPlural': '{{count}} duels',
  'team.pendingWagers.joiner': ' et ',
  'team.pendingWagers.message':
    'Cette équipe a encore {{parts}} en cours : attends leur résolution avant de la supprimer. Une mise engagée ne peut pas être rendue, et les cartes d’un duel doivent revenir à son vainqueur.',
  'team.onlyAdminOrOwner': 'Seuls ADMIN ou OWNER',
  'team.onlyOwnerCanCancelInvitation': 'Seul OWNER peut annuler une invitation',
  'team.invitationNotPending': 'L’invitation n’est pas PENDING',
  'team.onlyOwnerCanDeleteInvitation':
    'Seul OWNER peut supprimer une invitation',
  'team.cancelInvitationBeforeDeleting':
    'Annule l’invitation avant de la supprimer',

  // --- team-progression (bonus d'équipe) ---
  'teamProgression.notMember': 'Ce joueur n’appartient pas à cette équipe.',
  'teamProgression.noPerkPointsAvailable': 'Aucun point de bonus disponible.',
  'teamProgression.perkAlreadyMaxRank': 'Ce bonus est déjà au rang maximum.',
  'teamProgression.perkLocked': 'Ce bonus se débloque au niveau {{level}}.',
  'teamProgression.onlyLeaderAndOfficersCanSpend':
    'Seuls le chef et les officiers peuvent investir les points.',
  'teamProgression.onlyLeaderCanReset':
    'Seul le chef peut réinitialiser les bonus.',

  // --- recruitment (recrutement) ---
  'recruitment.teamNotRecruiting': 'Cette équipe ne recrute pas',
  'recruitment.joinRequestAlreadyPending':
    'Une candidature est déjà en attente pour cette équipe',
  'recruitment.reapplyBlocked':
    'Candidature refusée récemment ; réessaie après le {{until}}',
  'recruitment.maxPendingRequests': 'Maximum {{max}} candidatures en attente',
  'recruitment.noPendingJoinRequest':
    'Aucune candidature en attente pour cette équipe',
  'recruitment.joinRequestAlreadyProcessed': 'Candidature déjà traitée',
  'recruitment.joinRequestNotFound': 'Candidature introuvable',
  'recruitment.userReachedTeamLimit':
    '@{{username}} a atteint sa limite de {{max}} équipes',
  'recruitment.onlyAdminOrOwnerCanHandleRequests':
    'Seuls ADMIN ou OWNER peuvent traiter les candidatures',

  // --- combat / équipement / compétences / tour / campagne / raid ---
  'combatTeam.unknownMode': "Mode d'équipe inconnu : {{key}}",
  'combatTeam.sizeOutOfRange':
    'L’équipe doit contenir de 1 à {{max}} cartes (reçu {{got}})',
  'combatTeam.cardsMustBeDistinct':
    'Les cartes de l’équipe doivent être distinctes',
  'combatTeam.cardsNotOwned':
    'Une ou plusieurs cartes n’appartiennent pas à cet utilisateur',
  'combatTeam.campaignCannotInherit':
    "L'équipe de campagne ne peut pas hériter d'un autre mode",
  'combatPoints.notEnough':
    'Points de combat insuffisants (besoin de {{need}}, tu en as {{have}})',
  'equipment.userEquipmentNotFound': 'Équipement du joueur introuvable',
  'equipment.catalogNotSeeded': 'Aucun catalogue d’équipement seedé',
  'equipment.notFound': 'Équipement introuvable',
  'equipment.alreadyMaxLevel': 'Équipement déjà au niveau maximum',
  'equipment.cannotSalvageEquipped': 'Impossible de détruire un objet équipé',
  'skills.noPointsAvailable': 'Aucun point de compétence disponible',
  'skills.nodeNotFound': 'Nœud de compétence introuvable',
  'skills.nodeAlreadyMaxLevel': 'Nœud déjà au niveau maximum',
  'skills.prerequisiteNotMet':
    'Prérequis non rempli : le nœud {{node}} exige le niveau {{level}}',
  'skills.noAllocationsProvided': 'Aucune allocation fournie',
  'skills.notEnoughSkillPoints': 'Points de compétence insuffisants',
  'skills.nodeNotFoundWithId': 'Nœud de compétence introuvable : {{nodeId}}',
  'skills.nodeExceedsMaxLevel': 'Le nœud {{nodeId}} dépasse le niveau maximum',
  'skills.noPointsInvested': 'Aucun point de compétence investi',
  'tower.floorNotFound': 'Étage de tour introuvable',
  'tower.floorLocked': 'Étage de tour verrouillé',
  'combat.noTeamComposed':
    "Composez une équipe dans l'éditeur avant de combattre",
  'combat.cardsNotOwnedByPlayer':
    'Aucune des cartes fournies n’appartient à ce joueur',
  'tower.sweepRunsOutOfRange': 'Le balayage accepte de 1 à {{max}} passages',
  'tower.floorNotClearedYet':
    'Étage de tour pas encore franchi — rien à balayer',
  'campaign.stageNotFound': 'Étape introuvable',
  'campaign.stageLocked': 'Étape verrouillée',
  'campaign.sweepRunsOutOfRange': 'Le balayage doit être compris entre 1 et 10',
  'campaign.stageNotClearedYet': 'Étape pas encore terminée — rien à balayer',
  'raid.notFound': 'Raid introuvable',
  'raid.bossAlreadyDefeated':
    'Le boss est déjà vaincu, rendez-vous la semaine prochaine',
  'raid.noAttacksLeftToday': "Plus d'attaque aujourd'hui, reviens demain",
  'raid.invalidBossSpec': 'Spec de boss invalide',
  'raid.unavailable': 'Raid indisponible pour le moment, réessaie plus tard',
  'raid.bossNotFoundSeedFirst': 'Boss de raid introuvable — lancer le seed',
  'raid.tierNotFound': 'Palier introuvable',

  // --- wagers (paris et duels) ---
  'wagers.stakeMustBeInteger':
    'La mise doit être un nombre entier de poussière',
  'wagers.stakeBelowMin': 'La mise minimum est de {{min}} poussière',
  'wagers.stakeAboveMax': 'La mise maximum est de {{max}} poussière',
  'wagers.wouldPayNothingYes':
    'Ce pari ne rapporterait rien : {{target}} sortira presque à coup sûr cette rareté sur la fenêtre',
  'wagers.wouldPayNothingNo':
    "Ce pari ne rapporterait rien : {{target}} n'a presque aucune chance de sortir cette rareté sur la fenêtre",
  'wagers.betNotFound': 'Pari introuvable',
  'wagers.cannotBetOnOwnPulls': 'On ne parie pas sur ses propres tirages',
  'wagers.betNoLongerOpen': "Ce pari n'est plus ouvert",
  'wagers.targetStartedPulling':
    'La cible a commencé ses tirages : les mises sont closes',
  'wagers.alreadyBetOnThisBet': 'Tu as déjà misé sur ce pari',
  'wagers.maxOpenBetsPerBettor': 'Tu as déjà {{max}} paris en cours',
  'wagers.maxOpenBetsOnTarget':
    '{{target}} a déjà {{max}} paris ouverts sur lui',
  'wagers.sideWouldPayNothing':
    'Ce camp ne rapporterait rien : personne ne le contredit et les chances lui donnent raison',
  'wagers.playerNotFound': 'Joueur introuvable',
  'wagers.noActiveCardsOddsIncalculable':
    'Aucune carte active : cote incalculable',
  'wagers.teamMemberNotFound': "Membre d'équipe introuvable",
  'wagers.cannotBetOnSelf': 'Tu ne peux pas parier sur toi-même',
  'wagers.playerNotInTeam': "Ce joueur ne fait pas partie de l'équipe",
  'wagers.cannotDuelSelf': 'Tu ne peux pas te défier toi-même',
  'wagers.opponentNotInTeam': "Cet adversaire ne fait pas partie de l'équipe",
  'wagers.alreadyHaveDuelInProgress': 'Tu as déjà un duel en cours',
  'wagers.opponentAlreadyHasDuelInProgress':
    '{{opponent}} a déjà un duel en cours',
  'wagers.duelNotFoundAfterCreation':
    'Duel introuvable juste après sa création',
  'wagers.onlyChallengedCanAccept':
    'Seul le joueur défié peut accepter ce duel',
  'wagers.duelNotPendingAcceptance':
    "Ce duel n'est plus en attente d'acceptation",
  'wagers.acceptDeadlinePassed': 'Le délai pour accepter ce duel est dépassé',
  'wagers.duelTooLateNotPendingAcceptance':
    "Trop tard : ce duel n'est plus en attente d'acceptation",
  'wagers.duelNotFoundAfterAcceptance':
    'Duel introuvable juste après acceptation',
  'wagers.onlyChallengedCanDecline':
    'Seul le joueur défié peut refuser ce duel',
  'wagers.duelNotFoundAfterDecline': 'Duel introuvable juste après refus',
  'wagers.duelTooLateNotCancellable':
    "Trop tard : ce duel n'est plus annulable",
  'wagers.onlyChallengerCanCancel': 'Seul le défieur peut annuler ce duel',
  'wagers.duelNotFoundAfterCancellation':
    'Duel introuvable juste après annulation',
  // "reglé" sans accent : littéral, pas une faute à corriger — voir
  // task-6-brief.md « cette tâche déplace le texte, elle ne le réécrit pas ».
  'wagers.duelNotSettledYet': "Ce duel n'est pas encore reglé",
  'wagers.duelSettledWithoutAcceptedAt': 'Duel réglé sans acceptedAt',
  'wagers.cardEngagedInActiveDuel': 'Carte engagée dans un duel en cours',
  'wagers.duelNotFound': 'Duel introuvable',
} as const
