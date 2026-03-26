export interface StorageClientInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
  listObjects(prefix: string): Promise<StorageObject[]>
  exists(key: string): Promise<boolean>
  copy(sourceKey: string, destKey: string): Promise<void>
}

export type StorageObject = {
  key: string
  size: number
  lastModified: Date
}
