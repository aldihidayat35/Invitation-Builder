import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertSafeKey, type StorageDriver } from "./types";

export interface S3StorageConfig {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly forcePathStyle?: boolean;
}

const PRESIGN_TTL_SECONDS = 300;

export function createS3Storage(config: S3StorageConfig): StorageDriver {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const Bucket = config.bucket;

  return {
    kind: "s3",
    async presignPut(key, mime, bytes) {
      assertSafeKey(key);
      const command = new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: mime,
        ContentLength: bytes,
      });
      const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SECONDS });
      return { method: "PUT", url, headers: { "Content-Type": mime } };
    },
    async put(key, data, mime) {
      assertSafeKey(key);
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: data, ContentType: mime }));
    },
    async read(key, maxBytes) {
      assertSafeKey(key);
      try {
        const out = await client.send(
          new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${maxBytes}` }),
        );
        if (!out.Body) return null;
        return await out.Body.transformToByteArray();
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === "NoSuchKey" || name === "NotFound") return null;
        throw error;
      }
    },
    async remove(key) {
      assertSafeKey(key);
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}
