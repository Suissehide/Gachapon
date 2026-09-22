import { describe, expect, it } from '@jest/globals'

import { MAIL_COPY } from '../../main/infra/mail/mail-copy'

describe('textes des mails', () => {
  it('couvre les deux langues', () => {
    expect(Object.keys(MAIL_COPY).sort()).toEqual(['EN', 'FR'])
  })

  it('porte les mêmes entrées dans les deux langues', () => {
    expect(Object.keys(MAIL_COPY.FR).sort()).toEqual(
      Object.keys(MAIL_COPY.EN).sort(),
    )
  })

  it('injecte le lien dans le corps texte', () => {
    const url = 'https://example.test/verify-email?token=abc'
    expect(MAIL_COPY.EN.verifyText(url)).toContain(url)
    expect(MAIL_COPY.FR.verifyText(url)).toContain(url)
  })

  it('nomme l’invitant et l’équipe dans le sujet d’invitation', () => {
    const subject = MAIL_COPY.EN.invitationSubject('ayla', 'Les Renards')
    expect(subject).toContain('ayla')
    expect(subject).toContain('Les Renards')
  })
})
