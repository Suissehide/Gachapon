import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'

const _dirname = dirname(fileURLToPath(import.meta.url))

import type { IocContainer } from '../../types/application/ioc'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'
import type { Locale } from '../i18n/locale'
import { MAIL_COPY } from './mail-copy'

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
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
    })
  }

  /**
   * Le corps HTML vit dans `templates/<nom>.<locale>.html` — un fichier par
   * langue, pas de substitution de texte à l'intérieur d'un template unique
   * (voir task-7-brief.md). `locale.toLowerCase()` retombe sur les noms de
   * fichiers déjà en place (`.fr.html`/`.en.html`).
   */
  #render(
    templateName: string,
    locale: Locale,
    vars: Record<string, string>,
  ): string {
    const path = join(
      _dirname,
      'templates',
      `${templateName}.${locale.toLowerCase()}.html`,
    )
    let html = readFileSync(path, 'utf-8')
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value)
    }
    return html
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    locale: Locale,
  ): Promise<void> {
    const verifyUrl = `${this.#frontUrl}/verify-email?token=${token}`
    const copy = MAIL_COPY[locale]
    await this.#transporter.sendMail({
      from: this.#from,
      to,
      subject: copy.verifySubject,
      html: this.#render('verify-email', locale, { VERIFY_URL: verifyUrl }),
      text: copy.verifyText(verifyUrl),
    })
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
    locale: Locale,
  ): Promise<void> {
    const resetUrl = `${this.#frontUrl}/reset-password?token=${token}`
    const copy = MAIL_COPY[locale]
    await this.#transporter.sendMail({
      from: this.#from,
      to,
      subject: copy.resetSubject,
      html: this.#render('reset-password', locale, { RESET_URL: resetUrl }),
      text: copy.resetText(resetUrl),
    })
  }

  async sendTeamInvitationEmail(opts: {
    to: string
    teamName: string
    inviterName: string
    token: string
    locale: Locale
  }): Promise<void> {
    const inviteUrl = `${this.#frontUrl}/invitations/${opts.token}`
    const copy = MAIL_COPY[opts.locale]
    await this.#transporter.sendMail({
      from: this.#from,
      to: opts.to,
      subject: copy.invitationSubject(opts.inviterName, opts.teamName),
      html: this.#render('team-invitation', opts.locale, {
        TEAM_NAME: opts.teamName,
        INVITER_NAME: opts.inviterName,
        INVITE_URL: inviteUrl,
      }),
      text: copy.invitationText(opts.inviterName, opts.teamName, inviteUrl),
    })
  }
}
