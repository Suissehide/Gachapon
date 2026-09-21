import type { ErrorMessageKey } from './keys'

/**
 * Catalogue anglais des messages d'erreur. Typé en `Record<ErrorMessageKey,
 * string>` sur le référentiel de clés du français (voir `keys.ts`) : une clé
 * oubliée ici casse `npm run build`, par construction — aucun repli vers le
 * français pour le texte de code, contrairement au contenu de jeu.
 */
export const EN_MESSAGES: Record<ErrorMessageKey, string> = {
  'user.notFound': 'User not found',
  'user.usernameTaken': 'This username is already taken',
  'team.maxTeamsPerUser': 'Maximum {{max}} teams per user',

  // --- auth ---
  'auth.emailAlreadyInUse': 'Email already in use',
  'auth.unverifiedAccountPending':
    'An account is pending verification for this email',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.emailNotVerified': 'EMAIL_NOT_VERIFIED',
  'auth.invalidOrExpiredToken': 'Invalid or expired token',
  'auth.invalidOrExpiredRefreshToken': 'Invalid or expired refresh token',
  'auth.refreshTokenRevoked': 'Refresh token revoked',
  'auth.resendCooldown': 'Please wait before resending an email',
  'auth.unknownProvider': 'Unknown provider',
  'auth.oauthTokenExchangeFailed': 'OAuth provider token exchange failed',
  'auth.oauthUserinfoFailed': 'OAuth provider userinfo fetch failed',
  'auth.invalidApiKey': 'Invalid API key',
  'auth.accountSuspended': 'Account suspended',
  'auth.noAccessToken': 'No access token',
  'auth.notAuthenticated': 'Not authenticated',
  'auth.insufficientPermissions': 'Insufficient permissions',
  'auth.noRefreshToken': 'No refresh token',
  'auth.oauthMissingCodeOrState': 'Missing code or state',
  'auth.oauthInvalidState': 'Invalid OAuth state',

  // --- profile / admin users ---
  'profile.cardNotInCollection': 'Card not in your collection',
  'admin.cannotChangeOwnRole': 'Cannot change your own role',
  'admin.cannotSuspendSelf': 'Cannot suspend your own account',

  // --- collection / cards ---
  'collection.cardNotFound': 'Card not found',
  'collection.cardNotOwned': 'You do not own this card',
  'collection.userCardNotFound': 'UserCard not found',
  'cardAscension.maxPalierReached': 'Card already at max palier ({{max}})',
  'cardAscension.notTopOfPalier':
    'Card must be at top of palier (level {{requiredLevel}}) to ascend — currently level {{currentLevel}}',
  'cardAscension.needDuplicate':
    'Need at least 1 duplicate (quantity > 1) to ascend — current quantity is {{quantity}}',
  'cardDust.amountTooLow': 'amount must be at least 1',
  'cardDust.wouldLeaveZeroCopies':
    'Cannot convert {{amount}} — would leave 0 copies (have {{quantity}})',
  'cardLeveling.targetBelowCurrent':
    'targetLevel ({{target}}) must be greater than current level ({{current}})',
  'cardLeveling.targetExceedsPalierCap':
    'targetLevel ({{target}}) exceeds palier cap ({{cap}}) — ascend the card to unlock the next palier',
  'cardLeveling.notEnoughGold':
    'Not enough gold (need {{need}}, have {{have}})',
  'cardLeveling.notEnoughDust':
    'Not enough dust (need {{need}}, have {{have}})',
  'media.imageMustBeJpegPngWebp': 'Image must be jpeg, png or webp',
  'media.imageTooLarge': 'Image too large (max 5 MB)',
  'cards.imageOrUrlRequired': 'Either an image file or imageUrl is required',
  'cards.noImageProvided': 'No image provided',

  // --- gacha ---
  'gacha.noActiveCards': 'No active cards in any set',
  'gacha.notEnoughTokens': 'Not enough tokens',

  // --- shop / daily-shop / wishlist ---
  'shop.itemNotFound': 'Item not found',
  'economy.notEnoughGold': 'Not enough gold',
  'economy.notEnoughDust': 'Not enough dust',
  'shop.machineAlreadyOwned': 'Machine already owned',
  'shop.energyDailyCapReached': 'Daily energy purchase limit reached',
  'shop.boostMissingEffect':
    'BOOST item value has neither multiplier nor guaranteedRarity',
  'shop.boostMissingPulls': 'BOOST item value has no positive pulls count',
  'shop.boostRarityConflict':
    'A different boost is already active on this rarity',
  'shop.boostGuaranteeConflict': 'A boost of this type is already active',
  'shop.boostInvalidRarity': 'BOOST item has invalid rarity: {{rarity}}',
  'shop.energyPackMissingCombatPoints':
    'ENERGY_PACK item value has no positive integer combatPoints',
  'dailyShop.notEnoughActiveCards':
    'Not enough active cards to generate daily shop',
  'dailyShop.itemAlreadyPurchased': 'Item already purchased',
  'wishlist.cardNotFoundOrInactive': 'Card not found or set is inactive',
  'wishlist.full': 'Wishlist full ({{slots}} slots)',
  'wishlist.cardNotInWishlist': 'Card is not in your wishlist',
  'shop.shopItemNotFound': 'Shop item not found',

  // --- team ---
  'team.notFound': 'Team not found',
  'team.notMember': 'Not a member of this team',
  'team.full': 'This team is full ({{max}} members)',
  'team.userAlreadyMember': 'User is already a member',
  'team.invitationAlreadyPendingForUser':
    'Invitation already pending for this user',
  'team.invitationAlreadyPendingForEmail':
    'Invitation already pending for this email',
  'team.provideEmailOrUsername': 'Provide email or username',
  'team.onlyAdminOrOwnerCanInvite': 'Only ADMIN or OWNER can invite members',
  'team.invitationForAnotherUser': 'This invitation is for another user',
  'team.invitationNotFound': 'Invitation not found',
  'team.invitationAlreadyProcessed': 'Invitation already processed',
  'team.invitationExpired': 'Invitation expired',
  'team.alreadyMemberOfTeam': 'Already a member of this team',
  'team.memberNotFound': 'Member not found',
  'team.cannotRemoveOwner': 'Cannot remove the owner',
  'team.adminCannotRemoveAdmin': 'ADMIN cannot remove another ADMIN',
  'team.ownerMustTransferBeforeLeaving':
    'Owner must transfer ownership before leaving',
  'team.onlyOwnerCanChangeRoles': 'Only the owner can change member roles',
  'team.useOwnershipTransferForOwnerRole':
    'Use ownership transfer to change the owner role',
  'team.onlyOwnerCanTransferOwnership': 'Only the owner can transfer ownership',
  'team.newOwnerMustBeMember': 'New owner must be a member of the team',
  'team.onlyOwnerCanUpdateTeam': 'Only the owner can update the team',
  'team.onlyOwnerCanDeleteTeam': 'Only the owner can delete the team',
  'team.invitationNotFoundOrNotPending': 'Invitation not found or not pending',
  'team.onlyAdminOrOwnerCanResendInvitations':
    'Only ADMIN or OWNER can resend invitations',
  'team.cooldownActive': 'Cooldown active',
  'team.noRecipientEmail': 'No recipient email found',
  'team.pendingWagers.betSingular': '{{count}} bet',
  'team.pendingWagers.betPlural': '{{count}} bets',
  'team.pendingWagers.duelSingular': '{{count}} duel',
  'team.pendingWagers.duelPlural': '{{count}} duels',
  'team.pendingWagers.joiner': ' and ',
  'team.pendingWagers.message':
    'This team still has {{parts}} in progress: wait for them to be resolved before deleting it. A placed stake cannot be refunded, and duel cards must go to the winner.',
  'team.onlyAdminOrOwner': 'Only ADMIN or OWNER',
  'team.onlyOwnerCanCancelInvitation': 'Only OWNER can cancel an invitation',
  'team.invitationNotPending': 'Invitation is not PENDING',
  'team.onlyOwnerCanDeleteInvitation': 'Only OWNER can delete an invitation',
  'team.cancelInvitationBeforeDeleting':
    'Cancel the invitation before deleting it',

  // --- team-progression (team bonuses) ---
  'teamProgression.notMember': 'This player is not part of this team.',
  'teamProgression.noPerkPointsAvailable': 'No bonus point available.',
  'teamProgression.perkAlreadyMaxRank': 'This bonus is already at max rank.',
  'teamProgression.perkLocked': 'This bonus unlocks at level {{level}}.',
  'teamProgression.onlyLeaderAndOfficersCanSpend':
    'Only the leader and officers can spend points.',
  'teamProgression.onlyLeaderCanReset':
    'Only the leader can reset the bonuses.',

  // --- recruitment ---
  'recruitment.teamNotRecruiting': 'This team is not recruiting',
  'recruitment.joinRequestAlreadyPending':
    'Join request already pending for this team',
  'recruitment.reapplyBlocked':
    'Application recently declined; try again after {{until}}',
  'recruitment.maxPendingRequests': 'Maximum {{max}} pending applications',
  'recruitment.noPendingJoinRequest': 'No pending join request for this team',
  'recruitment.joinRequestAlreadyProcessed': 'Join request already processed',
  'recruitment.joinRequestNotFound': 'Join request not found',
  'recruitment.userReachedTeamLimit':
    '@{{username}} has reached their limit of {{max}} teams',
  'recruitment.onlyAdminOrOwnerCanHandleRequests':
    'Only ADMIN or OWNER can handle join requests',

  // --- combat / equipment / skills / tower / campaign / raid ---
  'combatTeam.unknownMode': 'Unknown team mode: {{key}}',
  'combatTeam.sizeOutOfRange':
    'Team must contain 1 to {{max}} cards (got {{got}})',
  'combatTeam.cardsMustBeDistinct': 'Team cards must be distinct',
  'combatTeam.cardsNotOwned': 'One or more cards are not owned by the user',
  'combatTeam.campaignCannotInherit':
    'The campaign team cannot inherit from another mode',
  'combatPoints.notEnough':
    'Not enough combat points (need {{need}}, have {{have}})',
  'equipment.userEquipmentNotFound': 'UserEquipment not found',
  'equipment.catalogNotSeeded': 'No equipment catalog seeded',
  'equipment.notFound': 'Equipment not found',
  'equipment.alreadyMaxLevel': 'Equipment already at max level',
  'equipment.cannotSalvageEquipped': 'Cannot salvage an equipped item',
  'skills.noPointsAvailable': 'No skill points available',
  'skills.nodeNotFound': 'Skill node not found',
  'skills.nodeAlreadyMaxLevel': 'Node already at max level',
  'skills.prerequisiteNotMet':
    'Prerequisite not met: node {{node}} requires level {{level}}',
  'skills.noAllocationsProvided': 'No allocations provided',
  'skills.notEnoughSkillPoints': 'Not enough skill points',
  'skills.nodeNotFoundWithId': 'Skill node not found: {{nodeId}}',
  'skills.nodeExceedsMaxLevel': 'Node {{nodeId}} exceeds max level',
  'skills.noPointsInvested': 'No skill points invested',
  'tower.floorNotFound': 'Tower floor not found',
  'tower.floorLocked': 'Tower floor locked',
  'combat.noTeamComposed': 'Build a team in the editor before fighting',
  'combat.cardsNotOwnedByPlayer':
    'None of the provided cards belong to this player',
  'tower.sweepRunsOutOfRange': 'Sweeping accepts 1 to {{max}} runs',
  'tower.floorNotClearedYet': 'Tower floor not cleared yet — nothing to sweep',
  'campaign.stageNotFound': 'Stage not found',
  'campaign.stageLocked': 'Stage is locked',
  'campaign.sweepRunsOutOfRange': 'Sweep runs must be 1-10',
  'campaign.stageNotClearedYet': 'Stage not cleared yet — cannot sweep',
  'raid.notFound': 'Raid not found',
  'raid.bossAlreadyDefeated':
    'The boss is already defeated, come back next week',
  'raid.noAttacksLeftToday': 'No attacks left today, come back tomorrow',
  'raid.invalidBossSpec': 'Invalid boss spec',
  'raid.unavailable': 'Raid unavailable right now, try again later',
  'raid.bossNotFoundSeedFirst': 'Raid boss not found — run the seed',
  'raid.tierNotFound': 'Tier not found',

  // --- wagers (bets and duels) ---
  'wagers.stakeMustBeInteger': 'The stake must be a whole number of dust',
  'wagers.stakeBelowMin': 'The minimum stake is {{min}} dust',
  'wagers.stakeAboveMax': 'The maximum stake is {{max}} dust',
  'wagers.wouldPayNothingYes':
    'This bet would pay nothing: {{target}} will almost certainly pull this rarity within the window',
  'wagers.wouldPayNothingNo':
    'This bet would pay nothing: {{target}} has almost no chance of pulling this rarity within the window',
  'wagers.betNotFound': 'Bet not found',
  'wagers.cannotBetOnOwnPulls': 'You cannot bet on your own pulls',
  'wagers.betNoLongerOpen': 'This bet is no longer open',
  'wagers.targetStartedPulling':
    'The target has started pulling: betting is closed',
  'wagers.alreadyBetOnThisBet': 'You have already bet on this bet',
  'wagers.maxOpenBetsPerBettor': 'You already have {{max}} open bets',
  'wagers.maxOpenBetsOnTarget':
    '{{target}} already has {{max}} open bets on them',
  'wagers.sideWouldPayNothing':
    'This side would pay nothing: nobody is against it and the odds already favor it',
  'wagers.playerNotFound': 'Player not found',
  'wagers.noActiveCardsOddsIncalculable':
    'No active cards: odds cannot be computed',
  'wagers.teamMemberNotFound': 'Team member not found',
  'wagers.cannotBetOnSelf': 'You cannot bet on yourself',
  'wagers.playerNotInTeam': 'This player is not part of the team',
  'wagers.cannotDuelSelf': 'You cannot challenge yourself',
  'wagers.opponentNotInTeam': 'This opponent is not part of the team',
  'wagers.alreadyHaveDuelInProgress': 'You already have a duel in progress',
  'wagers.opponentAlreadyHasDuelInProgress':
    '{{opponent}} already has a duel in progress',
  'wagers.duelNotFoundAfterCreation': 'Duel not found right after creation',
  'wagers.onlyChallengedCanAccept':
    'Only the challenged player can accept this duel',
  'wagers.duelNotPendingAcceptance':
    'This duel is no longer awaiting acceptance',
  'wagers.acceptDeadlinePassed': 'The deadline to accept this duel has passed',
  'wagers.duelTooLateNotPendingAcceptance':
    'Too late: this duel is no longer awaiting acceptance',
  'wagers.duelNotFoundAfterAcceptance': 'Duel not found right after acceptance',
  'wagers.onlyChallengedCanDecline':
    'Only the challenged player can decline this duel',
  'wagers.duelNotFoundAfterDecline': 'Duel not found right after decline',
  'wagers.duelTooLateNotCancellable':
    'Too late: this duel can no longer be cancelled',
  'wagers.onlyChallengerCanCancel': 'Only the challenger can cancel this duel',
  'wagers.duelNotFoundAfterCancellation':
    'Duel not found right after cancellation',
  'wagers.duelNotSettledYet': 'This duel is not settled yet',
  'wagers.duelSettledWithoutAcceptedAt': 'Duel settled without acceptedAt',
  'wagers.cardEngagedInActiveDuel': 'Card engaged in an active duel',
  'wagers.duelNotFound': 'Duel not found',

  // --- rewards / streak ---
  'rewards.notFound': 'Reward not found',
  'rewards.alreadyClaimed': 'Reward already claimed',
  'rewards.mustGrantAtLeastOneResource':
    'Reward must grant at least one resource',
  'rewards.noTargetUsers': 'No target users',
  'streak.defaultMilestoneNotFound':
    'Default streak milestone not found. Run the migration first.',
  'streak.milestoneAlreadyExistsForDay':
    'A milestone for day {{day}} already exists.',
  'streak.milestoneNotFound': 'Milestone not found',
  'streak.cannotDeleteDefaultMilestone':
    'Cannot delete the default daily milestone.',

  // --- admin: media / achievements / sets / quests ---
  'media.invalidKey': 'Invalid key',
  'media.nameCannotContainDot': 'Name cannot contain a dot',
  'media.invalidName': 'Invalid name',
  'media.sourceKeyNoValidExtension': 'Source key has no valid extension',
  'media.invalidDestinationKey': 'Invalid destination key',
  'media.nameIsIdentical': 'The name is unchanged',
  'media.invalidKeyWithValue': 'Invalid key: {{key}}',
  'media.imagesUsedBy': 'Image(s) used by: {{names}}',
  'media.deletionFailedFor': 'Deletion failed for: {{failed}}',
  'media.notFound': 'Media not found',
  'media.nameAlreadyUsed': 'This name is already in use',
  'admin.achievementNotFound': 'Achievement not found',
  'admin.setNotFound': 'Set not found',
  'admin.questNotFound': 'Quest not found',

  // --- infra ---
  'httpClient.getFailed': 'Error getting data',
  'httpClient.postFailed': 'Error posting data',
  'httpClient.deleteFailed': 'Error delete resource',
  'http.routeNotFound': 'Route {{method}} {{url}} not found',
}
