// Types
export type MediaItem = {
  key: string
  url: string
  size: number
  lastModified: string
  orphan: boolean
  card: {
    id: string
    name: string
    rarity: string
    variant: string | null
  } | null
}

export type UploadMediaResult = {
  created: MediaItem[]
  errors: { filename: string; reason: string }[]
}

// Routes
export const MEDIA_ROUTES = {
  admin: {
    media: '/admin/media',
    upload: '/admin/media/upload',
    rename: '/admin/media/rename',
  },
} as const
