import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { IocContainer } from '../../types/application/ioc'
import type { StorageClientInterface, StorageObject } from '../../types/infra/storage/storage-client'

export class MinioClient implements StorageClientInterface {
  readonly #s3: S3Client
  readonly #bucket: string
  readonly #endpoint: string
  readonly #publicBase: string

  constructor({ config }: IocContainer) {
    this.#bucket = config.minioBucket
    this.#endpoint = config.minioEndpoint
    this.#publicBase = config.minioPublicUrl ?? config.minioEndpoint
    this.#s3 = new S3Client({
      endpoint: config.minioEndpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
      forcePathStyle: true,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.#s3.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    return key
  }

  getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.#s3,
      new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      { expiresIn },
    )
  }

  async delete(key: string): Promise<void> {
    await this.#s3.send(
      new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }),
    )
  }

  publicUrl(key: string): string {
    return `${this.#publicBase}/${this.#bucket}/${key}`
  }

  async listObjects(prefix: string): Promise<StorageObject[]> {
    const results: StorageObject[] = []
    let continuationToken: string | undefined

    do {
      const response = await this.#s3.send(
        new ListObjectsV2Command({
          Bucket: this.#bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )
      for (const obj of response.Contents ?? []) {
        if (obj.Key && obj.Size !== undefined && obj.LastModified) {
          results.push({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          })
        }
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    return results
  }
}
