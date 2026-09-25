import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { apiUrl } from '../constants/config.constant'
import { cn } from '../libs/utils'

export const Route = createFileRoute('/discord')({
  component: DiscordIntegrationPage,
})

function CodeBlock({
  code,
  language = 'bash',
}: {
  code: string
  language?: string
}) {
  const { t } = useTranslation('discord')
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative group rounded-xl border border-border/50 bg-card overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <span className="text-xs text-text-light/60 font-mono">{language}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-xs text-text-light/60 hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted"
        >
          {copied ? t('copyButton.copied') : t('copyButton.copy')}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-5 py-8 border-b border-border/30 last:border-0">
      <div className="shrink-0 flex items-start justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary">
          {n}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-black text-foreground mb-3">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function EndpointRef({
  method,
  path,
  auth,
  children,
}: {
  method: string
  path: string
  auth: 'public' | 'key'
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-border/30 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-text-light">
          {method}
        </span>
        <code className="text-xs font-mono text-foreground">{path}</code>
        <span
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
            auth === 'public'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-primary/10 text-primary',
          )}
        >
          {auth === 'public' ? 'public' : 'X-API-Key'}
        </span>
      </div>
      <p className="text-xs text-text-light sm:flex-1">{children}</p>
    </div>
  )
}

function DiscordIntegrationPage() {
  const { t } = useTranslation('discord')
  const baseUrl = apiUrl ?? 'https://api.gachapon.app'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/discord" />
      <LandingNavbar />

      <div className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            {t('header.eyebrow')}
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            {t('header.title')}
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-xl">
            {t('header.description')}
          </p>
          <div className="flex items-center gap-3 mt-6">
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted border border-border/50 text-text-light">
              discord.js v14
            </span>
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted border border-border/50 text-text-light">
              Node.js ≥ 18
            </span>
            <Link
              to="/api-docs"
              className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors"
            >
              {t('header.apiReferenceLink')}
            </Link>
          </div>
        </div>

        {/* Steps */}
        <div>
          <Step n={1} title={t('steps.step1.title')}>
            <ol className="space-y-2 text-sm text-text-light">
              <li>
                {t('steps.step1.item1')}{' '}
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Discord Developer Portal
                </a>
              </li>
              <li>
                {t('steps.step1.item2Before')}{' '}
                <strong className="text-foreground">New Application</strong>
                {t('steps.step1.item2After')}
              </li>
              <li>
                {t('steps.step1.item3Before')}{' '}
                <strong className="text-foreground">Bot</strong>
                {t('steps.step1.item3Middle')}{' '}
                <strong className="text-foreground">Reset Token</strong>{' '}
                {t('steps.step1.item3After')}
              </li>
              <li>
                {t('steps.step1.item4Before')}{' '}
                <strong className="text-foreground">
                  Server Members Intent
                </strong>{' '}
                {t('steps.step1.item4And')}{' '}
                <strong className="text-foreground">
                  Message Content Intent
                </strong>
              </li>
              <li>
                {t('steps.step1.item5Before')}{' '}
                <strong className="text-foreground">
                  OAuth2 → URL Generator
                </strong>
                {t('steps.step1.item5Middle')}{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  bot
                </code>{' '}
                {t('steps.step1.item5Plus')}{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  applications.commands
                </code>
                {t('steps.step1.item5After')}
              </li>
            </ol>
          </Step>

          <Step n={2} title={t('steps.step2.title')}>
            <p className="text-sm text-text-light mb-3">
              {t('steps.step2.textBefore')}{' '}
              <Link
                to="/settings"
                className="text-primary underline underline-offset-2"
              >
                {t('steps.step2.settingsLink')}
              </Link>{' '}
              {t('steps.step2.textMiddle')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                X-API-Key
              </code>{' '}
              {t('steps.step2.textAfter')}
            </p>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600">
              {t('steps.step2.warning')}
            </div>
          </Step>

          <Step n={3} title={t('steps.step3.title')}>
            <CodeBlock
              language="bash"
              code={`mkdir gachapon-bot && cd gachapon-bot
npm init -y
npm install discord.js dotenv`}
            />
            <p className="text-sm text-text-light mb-2">
              {t('steps.step3.envFileIntro')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code>{' '}
              {t('steps.step3.envFileColon')}
            </p>
            <CodeBlock
              language=".env"
              code={`DISCORD_TOKEN=ton_token_discord
DISCORD_CLIENT_ID=ton_client_id
GACHAPON_API_KEY=ta_clé_api
GACHAPON_API_URL=${baseUrl}`}
            />
          </Step>

          <Step n={4} title={t('steps.step4.title')}>
            <p className="text-sm text-text-light mb-2">
              {t('steps.step4.textBefore')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                deploy-commands.js
              </code>{' '}
              {t('steps.step4.textAfter')}
            </p>
            <CodeBlock
              language="javascript"
              code={`import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import 'dotenv/config'

const commands = [
  new SlashCommandBuilder()
    .setName('pull')
    .setDescription('Tire une capsule Gachapon'),

  new SlashCommandBuilder()
    .setName('collection')
    .setDescription('Affiche ta collection de cartes'),

  new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche le top 10 des joueurs'),
].map((c) => c.toJSON())

const rest = new REST().setToken(process.env.DISCORD_TOKEN)
await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands },
)
console.log('Commandes enregistrées ✓')`}
            />
            <CodeBlock language="bash" code="node deploy-commands.js" />
          </Step>

          <Step n={5} title={t('steps.step5.title')}>
            <p className="text-sm text-text-light mb-2">
              {t('steps.step5.textBefore')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                POST /pulls
              </code>{' '}
              {t('steps.step5.textAfter')}
            </p>
            <CodeBlock
              language="javascript"
              code={`// handlers/pull.js
export async function handlePull(interaction) {
  await interaction.deferReply()

  const res = await fetch(\`\${process.env.GACHAPON_API_URL}/pulls\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.GACHAPON_API_KEY,
    },
  })

  if (res.status === 402) {
    return interaction.editReply('❌ Jetons insuffisants pour tirer une capsule.')
  }
  if (!res.ok) {
    return interaction.editReply('❌ Erreur lors du tirage.')
  }

  const { card, tokensRemaining } = await res.json()

  // Variantes réelles : NORMAL · BRILLIANT · HOLOGRAPHIC
  const variantEmoji = {
    NORMAL: '⚪',
    BRILLIANT: '✨',
    HOLOGRAPHIC: '🌈',
  }[card.variant] ?? '⚪'

  const variantLabel = {
    NORMAL: 'Normale',
    BRILLIANT: 'Brillante',
    HOLOGRAPHIC: 'Holographique',
  }[card.variant] ?? card.variant

  await interaction.editReply({
    embeds: [{
      title: \`\${variantEmoji} \${card.name}\`,
      description: \`**Rareté :** \${card.rarity}\\n**Set :** \${card.set.name}\\n**Variante :** \${variantLabel}\\n**Jetons restants :** \${tokensRemaining}\`,
      color: card.variant === 'BRILLIANT' ? 0xf59e0b
        : card.variant === 'HOLOGRAPHIC' ? 0x818cf8
        : 0x94a3b8,
      footer: { text: 'Gachapon' },
    }],
  })
}`}
            />
          </Step>

          <Step n={6} title={t('steps.step6.title')}>
            <CodeBlock
              language="javascript"
              code={`// handlers/collection.js
export async function handleCollection(interaction) {
  await interaction.deferReply()

  const headers = { 'X-API-Key': process.env.GACHAPON_API_KEY }

  // 1. Identifie l'utilisateur lié à la clé API
  const me = await fetch(
    \`\${process.env.GACHAPON_API_URL}/auth/me\`,
    { headers },
  ).then((r) => r.json())

  // 2. Récupère sa collection — { cards: [{ card: { name }, quantity, ... }] }
  const { cards } = await fetch(
    \`\${process.env.GACHAPON_API_URL}/users/\${me.id}/collection\`,
    { headers },
  ).then((r) => r.json())

  const preview = cards
    .slice(0, 5)
    .map((c) => \`• \${c.card.name}\`)
    .join('\\n')

  await interaction.editReply({
    embeds: [{
      title: \`🗂 Ta collection (\${cards.length} cartes)\`,
      description: preview || "Aucune carte pour l'instant.",
      color: 0x22c55e,
    }],
  })
}

// handlers/leaderboard.js
export async function handleLeaderboard(interaction) {
  await interaction.deferReply()

  // Classements disponibles : /collectors · /teams · /combat
  const { entries } = await fetch(
    \`\${process.env.GACHAPON_API_URL}/leaderboard/collectors\`,
    { headers: { 'X-API-Key': process.env.GACHAPON_API_KEY } },
  ).then((r) => r.json())

  const lines = entries.slice(0, 10).map(
    (e) => \`\${e.rank}. **\${e.user.username}** — \${e.cardPercentage}% de collection\`
  )

  await interaction.editReply({
    embeds: [{
      title: '🏆 Classement collectionneurs',
      description: lines.join('\\n'),
      color: 0xf59e0b,
    }],
  })
}`}
            />
          </Step>

          <Step n={7} title={t('steps.step7.title')}>
            <CodeBlock
              language="javascript"
              code={`// index.js
import { Client, Events, GatewayIntentBits } from 'discord.js'
import 'dotenv/config'
import { handleCollection } from './handlers/collection.js'
import { handleLeaderboard } from './handlers/leaderboard.js'
import { handlePull } from './handlers/pull.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, () => {
  console.log(\`Connecté en tant que \${client.user.tag}\`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === 'pull') await handlePull(interaction)
  if (interaction.commandName === 'collection') await handleCollection(interaction)
  if (interaction.commandName === 'classement') await handleLeaderboard(interaction)
})

client.login(process.env.DISCORD_TOKEN)`}
            />
            <CodeBlock language="bash" code="node index.js" />
          </Step>

          <Step n={8} title={t('steps.step8.title')}>
            <p className="text-sm text-text-light mb-4">
              {t('steps.step8.intro1')}{' '}
              <span className="text-green-600 font-semibold">
                {t('steps.step8.publicLabel')}
              </span>
              {t('steps.step8.intro2')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                X-API-Key
              </code>
              {t('steps.step8.period')}
            </p>

            <div className="rounded-xl border border-border/50 bg-card px-4 my-4">
              <EndpointRef method="post" path="/pulls/batch" auth="key">
                {t('endpoints.pullsBatch.before')}{' '}
                <code className="text-[11px] bg-muted px-1 rounded">
                  {'{ count: 1-10 }'}
                </code>
                {t('endpoints.pullsBatch.middle')}{' '}
                <code className="text-[11px] bg-muted px-1 rounded">
                  {'{ pulls, tokensRemaining, xpGained }'}
                </code>
                {t('endpoints.pullsBatch.after')}
              </EndpointRef>
              <EndpointRef method="get" path="/tokens/balance" auth="key">
                {t('endpoints.tokensBalance')}
              </EndpointRef>
              <EndpointRef method="get" path="/streak/summary" auth="key">
                {t('endpoints.streakSummary')}
              </EndpointRef>
              <EndpointRef method="get" path="/pulls/recent" auth="key">
                {t('endpoints.pullsRecent')}
              </EndpointRef>
              <EndpointRef method="get" path="/pulls/history" auth="key">
                {t('endpoints.pullsHistory')}
              </EndpointRef>
              <EndpointRef method="get" path="/quests" auth="key">
                {t('endpoints.quests')}
              </EndpointRef>
              <EndpointRef method="get" path="/rewards/pending" auth="key">
                {t('endpoints.rewardsPending')}
              </EndpointRef>
              <EndpointRef method="post" path="/rewards/claim-all" auth="key">
                {t('endpoints.rewardsClaimAll')}
              </EndpointRef>
              <EndpointRef
                method="get"
                path="/users/{username}/profile"
                auth="key"
              >
                {t('endpoints.userProfile')}
              </EndpointRef>
              <EndpointRef method="get" path="/leaderboard/combat" auth="key">
                {t('endpoints.leaderboardCombat')}
              </EndpointRef>
              <EndpointRef method="get" path="/stats" auth="public">
                {t('endpoints.stats')}
              </EndpointRef>
              <EndpointRef method="get" path="/pulls/rates" auth="public">
                {t('endpoints.pullsRates')}
              </EndpointRef>
              <EndpointRef method="get" path="/economy/config" auth="public">
                {t('endpoints.economyConfig')}
              </EndpointRef>
            </div>

            <p className="text-sm text-text-light mt-6 mb-2">
              {t('steps.step8.example1Before')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                /pull10
              </code>{' '}
              {t('steps.step8.example1Via')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                POST /pulls/batch
              </code>{' '}
              {t('steps.step8.example1After')}
            </p>
            <CodeBlock
              language="javascript"
              code={`// handlers/pull10.js
export async function handlePull10(interaction) {
  await interaction.deferReply()

  const res = await fetch(\`\${process.env.GACHAPON_API_URL}/pulls/batch\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.GACHAPON_API_KEY,
    },
    body: JSON.stringify({ count: 10 }),
  })

  if (res.status === 402) {
    return interaction.editReply('❌ Jetons insuffisants (10 requis).')
  }

  const { pulls, tokensRemaining } = await res.json()

  const emoji = { NORMAL: '⚪', BRILLIANT: '✨', HOLOGRAPHIC: '🌈' }
  const lines = pulls.map(
    (p) => \`\${emoji[p.card.variant] ?? '⚪'} \${p.card.name}\` +
      (p.wasDuplicate ? ' (doublon)' : '')
  )

  await interaction.editReply({
    embeds: [{
      title: '🎊 Tirage x10',
      description: lines.join('\\n'),
      footer: { text: \`\${tokensRemaining} jetons restants\` },
      color: 0xf59e0b,
    }],
  })
}`}
            />

            <p className="text-sm text-text-light mt-6 mb-2">
              {t('steps.step8.example2Before')}{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {t('steps.step8.example2Command')}
              </code>{' '}
              {t('steps.step8.example2ViaEndpoint')}{' '}
              <strong className="text-foreground">public</strong>{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                GET /pulls/rates
              </code>{' '}
              {t('steps.step8.example2Requirement')}
            </p>
            <CodeBlock
              language="javascript"
              code={`// handlers/rates.js
export async function handleRates(interaction) {
  const { rates } = await fetch(
    \`\${process.env.GACHAPON_API_URL}/pulls/rates\`,
  ).then((r) => r.json())

  const lines = rates.map((r) => \`**\${r.rarity}** — \${r.pct}%\`)

  await interaction.reply({
    embeds: [{
      title: '🎯 Taux de drop',
      description: lines.join('\\n'),
      color: 0x818cf8,
    }],
  })
}`}
            />

            <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-xs text-text-light mt-4">
              {t('steps.step8.tipBefore')}{' '}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                deploy-commands.js
              </code>{' '}
              {t('steps.step8.tipMiddle')}{' '}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                index.js
              </code>{' '}
              {t('steps.step8.tipAfter')}
            </div>
          </Step>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {t('footerCta.title')}
            </p>
            <p className="text-xs text-text-light">
              {t('footerCta.description')}
            </p>
          </div>
          <Link
            to="/api-docs"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            {t('header.apiReferenceLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}
