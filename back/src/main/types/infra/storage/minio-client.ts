export interface MinioClientInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
}
