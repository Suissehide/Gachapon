import type { Locale } from '../../../infra/i18n/locale'

export interface IMailService {
  sendVerificationEmail(
    to: string,
    token: string,
    locale: Locale,
  ): Promise<void>
  sendPasswordResetEmail(
    to: string,
    token: string,
    locale: Locale,
  ): Promise<void>
  sendTeamInvitationEmail(opts: {
    to: string
    teamName: string
    inviterName: string
    token: string
    locale: Locale
  }): Promise<void>
}
