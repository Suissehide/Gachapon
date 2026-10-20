import fastifySwagger from '@fastify/swagger'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

const swaggerPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Gachapon API',
        version: '1.0.0',
        description: [
          'Public API for the Gachapon gacha game platform.',
          '',
          'Guest accounts can use every solo endpoint; team, raid, duel, bet and API-key endpoints answer 403 `GUEST_FORBIDDEN`.',
          '',
          'Protected endpoints accept either the `access_token` session cookie or an API key sent in the `X-API-Key` header — generate one in Settings → API keys. Endpoints without a lock need no authentication.',
          '',
          'Building a Discord bot? Follow the step-by-step guide at /discord.',
        ].join('\n'),
      },
      // Ordre d'affichage dans /api-docs. Le tag de chaque route est déduit
      // de son chemin dans `routes/index.ts` (TAG_BY_PATH_PREFIX).
      tags: [
        {
          name: 'Gacha',
          description: 'Pull capsules, token balance, pull history and rates.',
        },
        {
          name: 'Collection',
          description:
            'Cards, sets, a player collection, card upgrades and alchemy.',
        },
        { name: 'Wishlist', description: 'Cards a player is hunting for.' },
        {
          name: 'Progression',
          description:
            'Daily streak, welcome-back chest, quests, achievements, rewards, skills.',
        },
        {
          name: 'Shop',
          description: 'Permanent shop, daily shop and customer orders.',
        },
        {
          name: 'Combat',
          description: 'Combat teams, points and equipment.',
        },
        {
          name: 'Campaign',
          description: 'Story campaign stages and the wandering monster.',
        },
        { name: 'Tower', description: 'Elemental towers.' },
        {
          name: 'Teams',
          description: 'Teams, members, invitations and join requests.',
        },
        { name: 'Raid', description: 'Weekly team raid boss.' },
        { name: 'Wagers', description: 'Team duels and bets.' },
        {
          name: 'Leaderboard',
          description: 'Collector, team and combat rankings.',
        },
        { name: 'Users', description: 'Public profiles and my account.' },
        {
          name: 'Game data',
          description: 'Public economy configuration and global statistics.',
        },
        { name: 'Auth', description: 'Session-based authentication.' },
        { name: 'API keys', description: 'Manage personal API keys.' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'access_token',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
})

export { swaggerPlugin }
