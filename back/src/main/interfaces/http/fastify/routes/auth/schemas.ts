import { z } from 'zod/v4'

export const registerBodySchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.email(),
  password: z.string().min(8).max(100),
})

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string(),
})

export const userResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  tokens: z.number(),
  dust: z.number(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  createdAt: z.date(),
})
