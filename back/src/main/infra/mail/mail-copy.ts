import type { Locale } from '../i18n/locale'

/**
 * Sujets et corps texte des mails transactionnels. Les corps HTML vivent
 * dans `templates/<nom>.<locale>.html` — ici ne sont que les chaînes que le
 * code assemble lui-même (sujet, alternative texte brut du mail).
 *
 * Même garantie que le catalogue d'erreurs (`infra/i18n/error-messages`) :
 * le français sert de référentiel de clés — `MailCopy` est dérivé de
 * `MAIL_COPY_FR` — et `MAIL_COPY_EN` est typé contre ce référentiel, si bien
 * qu'une entrée manquante ou de signature différente casse la compilation.
 * Un simple `satisfies Record<Locale, Record<string, unknown>>` ne suffirait
 * PAS : `Record<string, unknown>` n'impose aucune clé précise, une entrée
 * oubliée dans une seule langue compilerait sans broncher (voir
 * global-constraints.md, « Repli du texte de code : aucun »).
 *
 * La convention « @pseudo » de l'interface est conservée en anglais dans les
 * deux langues : c'est une marque du produit, pas un tour de langue
 * français.
 *
 * `unknownInviter` n'est pas dans l'interface du brief mais comble un trou
 * du même ordre : `team.domain.ts` retombait sur le mot français
 * "Quelqu'un" quand une invitation n'a pas d'invitant connu
 * (`invitedById` est nullable en base) — un invité anglophone aurait donc vu
 * "@Quelqu'un invited you..." dans un mail par ailleurs entièrement en
 * anglais. Traité comme le reste du texte de code : une clé par langue, pas
 * de repli implicite.
 */
const MAIL_COPY_FR = {
  verifySubject: 'Confirme ton adresse — Gachapon',
  verifyText: (url: string) =>
    `Confirme ton adresse email Gachapon en ouvrant ce lien : ${url}`,
  resetSubject: 'Réinitialisation de ton mot de passe — Gachapon',
  resetText: (url: string) =>
    `Réinitialise ton mot de passe Gachapon en ouvrant ce lien : ${url}\n\nCe lien est valable 1 heure. Si tu n'as pas fait cette demande, ignore ce message.`,
  invitationSubject: (inviter: string, team: string) =>
    `@${inviter} t'invite à rejoindre ${team} — Gachapon`,
  invitationText: (inviter: string, team: string, url: string) =>
    `@${inviter} t'invite à rejoindre ${team} sur Gachapon.\n\nAccepte l'invitation ici : ${url}`,
  unknownInviter: "Quelqu'un",
}

type MailCopy = typeof MAIL_COPY_FR

const MAIL_COPY_EN: MailCopy = {
  verifySubject: 'Confirm your email — Gachapon',
  verifyText: (url: string) =>
    `Confirm your Gachapon email address by opening this link: ${url}`,
  resetSubject: 'Reset your password — Gachapon',
  resetText: (url: string) =>
    `Reset your Gachapon password by opening this link: ${url}\n\nThis link is valid for 1 hour. If you didn't request it, ignore this message.`,
  invitationSubject: (inviter: string, team: string) =>
    `@${inviter} invited you to join ${team} — Gachapon`,
  invitationText: (inviter: string, team: string, url: string) =>
    `@${inviter} invited you to join ${team} on Gachapon.\n\nAccept the invitation here: ${url}`,
  unknownInviter: 'Someone',
}

export const MAIL_COPY: Record<Locale, MailCopy> = {
  FR: MAIL_COPY_FR,
  EN: MAIL_COPY_EN,
}
