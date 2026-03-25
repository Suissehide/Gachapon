import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'

const _dirname = dirname(fileURLToPath(import.meta.url))

import type { IocContainer } from '../../types/application/ioc'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'

export class MailService implements IMailService {
  readonly #transporter: nodemailer.Transporter
  readonly #from: string
  readonly #frontUrl: string

  constructor({ config }: IocContainer) {
    this.#from = config.smtpFrom
    this.#frontUrl = config.frontUrl
    this.#transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth:
        config.smtpUser
          ? { user: config.smtpUser, pass: config.smtpPass }
          : undefined,
    })
  }

  #render(templateName: string, vars: Record<string, string>): string {
    const path = join(_dirname, 'templates', templateName)
    let html = readFileSync(path, 'utf-8')
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value)
    }
    return html
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.#frontUrl}/verify-email?token=${token}`
    const html = this.#render('verify-email.html', { VERIFY_URL: verifyUrl })
    await this.#transporter.sendMail({
      from: this.#from,
      to,
      subject: 'Confirme ton adresse — Gachapon',
      html,
    })
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.#frontUrl}/reset-password?token=${token}`
    const html = this.#render('reset-password.html', { RESET_URL: resetUrl })
    await this.#transporter.sendMail({
      from: this.#from,
      to,
      subject: 'Réinitialisation de ton mot de passe — Gachapon',
      html,
    })
  }

  async sendTeamInvitationEmail(opts: {
    to: string
    teamName: string
    inviterName: string
    token: string
  }): Promise<void> {
    const inviteUrl = `${this.#frontUrl}/invitations/${opts.token}`
    const html = this.#render('team-invitation.html', {
      TEAM_NAME: opts.teamName,
      INVITER_NAME: opts.inviterName,
      INVITE_URL: inviteUrl,
    })
    await this.#transporter.sendMail({
      from: this.#from,
      to: opts.to,
      subject: `@${opts.inviterName} t'invite à rejoindre ${opts.teamName} — Gachapon`,
      html,
    })
  }
}
