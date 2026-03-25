export interface IMailService {
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendTeamInvitationEmail(opts: {
    to: string
    teamName: string
    inviterName: string
    token: string
  }): Promise<void>
}
