import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config as configDotenv } from 'dotenv'
import { z } from 'zod/v4'

import baseDir from '../base-dir'
import type { ConfigEnvVars } from '../types/application/config'
import { pickFromDict, toCamelCase } from '../utils/helper'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTestRunning = process.env.JEST_RUNNING === 'true'
const envLocalPath = join(baseDir, '.env.local')
const envLocalExists = existsSync(envLocalPath)
if (envLocalExists) {
  configDotenv({ debug: isDevelopment, encoding: 'utf8', path: envLocalPath })
}
configDotenv({
  debug: isDevelopment,
  encoding: 'utf8',
  path: join(baseDir, '.env'),
})

const configSchema = z.object({
  baseDir: z.string(),
  isDevelopment: z.boolean(),
  isTestRunning: z.boolean().default(false),

  host: z.string().optional(),
  port: z
    .string()
    .default('3000')
    .transform((v) => Number.parseInt(v, 10)),
  corsOrigin: z.string().optional(),
  frontUrl: z.string().default('http://localhost:5173'),
  logLevel: z.string().default('info'),

  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),

  minioEndpoint: z.string().default('http://localhost:9000'),
  minioAccessKey: z.string().default('minioadmin'),
  minioSecretKey: z.string().default('minioadmin'),
  minioBucket: z.string().default('gachapon'),

  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  jwtRefreshSecret: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),

  googleClientId: z.string().default(''),
  googleClientSecret: z.string().default(''),
  googleRedirectUri: z
    .string()
    .default('http://localhost:3000/auth/oauth/google/callback'),

  discordClientId: z.string().default(''),
  discordClientSecret: z.string().default(''),
  discordRedirectUri: z
    .string()
    .default('http://localhost:3000/auth/oauth/discord/callback'),

  tokenRegenIntervalHours: z
    .string()
    .default('4')
    .transform((v) => Number.parseInt(v, 10)),
  tokenMaxStock: z
    .string()
    .default('5')
    .transform((v) => Number.parseInt(v, 10)),
  pityThreshold: z
    .string()
    .default('100')
    .transform((v) => Number.parseInt(v, 10)),
})

export type Config = z.infer<typeof configSchema>

const envVarNames = [
  'HOST',
  'PORT',
  'CORS_ORIGIN',
  'FRONT_URL',
  'LOG_LEVEL',
  'DATABASE_URL',
  'REDIS_URL',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'TOKEN_REGEN_INTERVAL_HOURS',
  'TOKEN_MAX_STOCK',
  'PITY_THRESHOLD',
]

const loadConfig = () => {
  const envConfig = pickFromDict<ConfigEnvVars>(
    process.env,
    envVarNames,
    toCamelCase,
  )
  const configData = { ...envConfig, baseDir, isDevelopment, isTestRunning }
  return configSchema.parse(configData)
}

export { loadConfig, configSchema }
