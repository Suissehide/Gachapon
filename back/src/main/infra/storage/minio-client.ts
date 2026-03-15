import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { IocContainer } from '../../types/application/ioc'
import type { MinioClientInterface } from '../../types/infra/storage/minio-client'

export class MinioClient implements MinioClientInterface {
  readonly #s3: S3Client
  readonly #bucket: string
  readonly #endpoint: string

  constructor({ config }: IocContainer) {
    this.#bucket = config.minioBucket
    this.#endpoint = config.minioEndpoint
    this.#s3 = new S3Client({
      endpoint: config.minioEndpoint,
      region: 'us-east-1',
      credentials: { accessKeyId: config.minioAccessKey, secretAccessKey: config.minioSecretKey },
      forcePathStyle: true,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.#s3.send(new PutObjectCommand({ Bucket: this.#bucket, Key: key, Body: body, ContentType: contentType }))
    return key
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.#s3, new GetObjectCommand({ Bucket: this.#bucket, Key: key }), { expiresIn })
  }

  async delete(key: string): Promise<void> {
    await this.#s3.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }))
  }

  publicUrl(key: string): string {
    return `${this.#endpoint}/${this.#bucket}/${key}`
  }
}
