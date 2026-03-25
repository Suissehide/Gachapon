import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { apiUrl } from '../constants/config.constant'

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
          {copied ? 'Copié ✓' : 'Copier'}
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

function DiscordIntegrationPage() {
  const baseUrl = apiUrl ?? 'https://api.gachapon.app'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      <div className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            Intégrations
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            Bot Discord
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-xl">
            Connecte ton serveur Discord à Gachapon via l'API publique. Tes
            membres pourront tirer des capsules, consulter leur collection et
            suivre le classement — sans quitter Discord.
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
              Référence API →
            </Link>
          </div>
        </div>

        {/* Steps */}
        <div>
          <Step n={1} title="Créer l'application Discord">
            <ol className="space-y-2 text-sm text-text-light">
              <li>
                1. Ouvre le{' '}
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
                2. Clique sur{' '}
                <strong className="text-foreground">New Application</strong>,
                donne un nom à ton bot
              </li>
              <li>
                3. Dans l'onglet{' '}
                <strong className="text-foreground">Bot</strong>, clique{' '}
                <strong className="text-foreground">Reset Token</strong> et note
                le token
              </li>
              <li>
                4. Active{' '}
                <strong className="text-foreground">
                  Server Members Intent
                </strong>{' '}
                et{' '}
                <strong className="text-foreground">
                  Message Content Intent
                </strong>
              </li>
              <li>
                5. Dans{' '}
                <strong className="text-foreground">
                  OAuth2 → URL Generator
                </strong>
                , coche{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  bot
                </code>{' '}
                +{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  applications.commands
                </code>
                , puis invite le bot sur ton serveur
              </li>
            </ol>
          </Step>

          <Step n={2} title="Générer ta clé API Gachapon">
            <p className="text-sm text-text-light mb-3">
              Connecte-toi à Gachapon, va dans{' '}
              <Link
                to="/settings"
                className="text-primary underline underline-offset-2"
              >
                Paramètres → Clés API
              </Link>{' '}
              et génère une nouvelle clé. Elle sera passée dans le header{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                X-API-Key
              </code>{' '}
              de chaque requête.
            </p>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Stocke ta clé dans une variable d'environnement, jamais en clair
              dans le code.
            </div>
          </Step>

          <Step n={3} title="Initialiser le projet">
            <CodeBlock
              language="bash"
              code={`mkdir gachapon-bot && cd gachapon-bot
npm init -y
npm install discord.js dotenv`}
            />
            <p className="text-sm text-text-light mb-2">
              Crée un fichier{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code>{' '}
              :
            </p>
            <CodeBlock
              language=".env"
              code={`DISCORD_TOKEN=ton_token_discord
DISCORD_CLIENT_ID=ton_client_id
GACHAPON_API_KEY=ta_clé_api
GACHAPON_API_URL=${baseUrl}`}
            />
          </Step>

          <Step n={4} title="Enregistrer les commandes slash">
            <p className="text-sm text-text-light mb-2">
              Crée{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                deploy-commands.js
              </code>{' '}
              pour déclarer les commandes auprès de Discord :
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

          <Step n={5} title="Commande /pull">
            <p className="text-sm text-text-light mb-2">
              La commande principale : elle appelle{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                POST /pulls
              </code>{' '}
              et affiche le résultat.
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
    return interaction.editReply('❌ Tokens insuffisants pour tirer une capsule.')
  }
  if (!res.ok) {
    return interaction.editReply('❌ Erreur lors du tirage.')
  }

  const pull = await res.json()
  const { card } = pull

  const rarityEmoji = {
    STANDARD: '⚪',
    HOLOGRAPHIC: '🌈',
    SHINY: '✨',
  }[card.variant] ?? '⚪'

  await interaction.editReply({
    embeds: [{
      title: \`\${rarityEmoji} \${card.name}\`,
      description: \`**Set :** \${card.setName}\\n**Variante :** \${card.variant}\`,
      color: card.variant === 'SHINY' ? 0xf59e0b
        : card.variant === 'HOLOGRAPHIC' ? 0x818cf8
        : 0x94a3b8,
      footer: { text: 'Gachapon' },
    }],
  })
}`}
            />
          </Step>

          <Step n={6} title="Commandes /collection et /classement">
            <CodeBlock
              language="javascript"
              code={`// handlers/collection.js
export async function handleCollection(interaction) {
  await interaction.deferReply()

  const res = await fetch(\`\${process.env.GACHAPON_API_URL}/collection\`, {
    headers: { 'X-API-Key': process.env.GACHAPON_API_KEY },
  })

  const { cards, total } = await res.json()
  const preview = cards.slice(0, 5).map((c) => \`• \${c.name}\`).join('\\n')

  await interaction.editReply({
    embeds: [{
      title: \`🗂 Ta collection (\${total} cartes)\`,
      description: preview || 'Aucune carte pour l'instant.',
      color: 0x22c55e,
    }],
  })
}

// handlers/leaderboard.js
export async function handleLeaderboard(interaction) {
  await interaction.deferReply()

  const res = await fetch(\`\${process.env.GACHAPON_API_URL}/leaderboard\`, {
    headers: { 'X-API-Key': process.env.GACHAPON_API_KEY },
  })

  const { entries } = await res.json()
  const lines = entries.slice(0, 10).map(
    (e, i) => \`\${i + 1}. **\${e.username}** — \${e.totalCards} cartes\`
  )

  await interaction.editReply({
    embeds: [{
      title: '🏆 Classement Gachapon',
      description: lines.join('\\n'),
      color: 0xf59e0b,
    }],
  })
}`}
            />
          </Step>

          <Step n={7} title="Assembler le bot">
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
        </div>

        {/* Footer CTA */}
        <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Endpoints disponibles
            </p>
            <p className="text-xs text-text-light">
              Consulte la documentation interactive pour voir tous les endpoints
              et leurs paramètres.
            </p>
          </div>
          <Link
            to="/api-docs"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Référence API →
          </Link>
        </div>
      </div>
    </div>
  )
}
