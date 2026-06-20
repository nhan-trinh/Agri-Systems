import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService } from './storage.interface';
import config from '../../config/app.config';

/**
 * Cloudflare R2 storage service using the AWS S3 SDK v3.
 *
 * Cloudflare R2 is fully S3-compatible. The main difference from standard S3:
 * - Endpoint: `https://<accountId>.r2.cloudflarestorage.com`
 * - forcePathStyle: true (path-style URLs)
 * - region: `auto`
 * - No public-read ACL — all access via presigned URLs.
 */
export class R2StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;
  private presignExpirySec: number;

  constructor() {
    const { r2 } = config.storage;
    if (!r2.accountId || !r2.bucket || !r2.accessKeyId || !r2.secretAccessKey) {
      console.warn('[R2StorageService] Missing R2 credentials. File operations will fail.');
    }

    this.bucket = r2.bucket;
    this.presignExpirySec = r2.presignExpirySec;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
      // R2 requires path-style addressing
      forcePathStyle: true,
    });
  }

  public async saveFile(relativePath: string, buffer: Buffer): Promise<{ url: string; objectKey: string }> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: relativePath,
      Body: buffer,
      // No ACL — R2 bucket is private; access via presigned URLs only.
    }));

    // No public URL for R2 private bucket; return empty string for the url field.
    // Use getPresignedDownloadUrl() for actual access.
    return { url: '', objectKey: relativePath };
  }

  public async deleteFile(relativePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: relativePath,
    }));
  }

  /**
   * Generates a short-lived presigned GET URL for private R2 objects.
   */
  public async getPresignedDownloadUrl(relativePath: string, expirySec?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: relativePath,
    });

    const seconds = expirySec ?? this.presignExpirySec;
    return getSignedUrl(this.client, command, { expiresIn: seconds });
  }

  /**
   * Reads an object from R2 into a Buffer.
   */
  public async getFileBuffer(relativePath: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: relativePath,
    }));

    if (!response.Body) {
      throw new Error(`Empty response body for key: ${relativePath}`);
    }

    // response.Body is a web stream in Node 18+
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
}
export const r2StorageService = new R2StorageService();

/**
 * @deprecated Use r2StorageService instead. Kept as alias for backward compatibility.
 */
export const s3StorageService = r2StorageService;
