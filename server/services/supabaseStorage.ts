import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "project-files";
const BRAND_BUCKET = process.env.SUPABASE_BRANDING_BUCKET || "studio-branding";
const STORYBOARD_BUCKET = process.env.SUPABASE_STORYBOARD_BUCKET || "shot-storyboards";

let r2Client: S3Client | null = null;

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let bucketReady: Promise<void> | null = null;
let brandBucketReady: Promise<void> | null = null;
let storyboardBucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const client = adminClient();
      const { data } = await client.storage.getBucket(BUCKET);
      if (data) return;
      const { error } = await client.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: `${Number(process.env.MAX_UPLOAD_SIZE_MB || 10)}MB`,
      });
      if (error && !error.message.toLowerCase().includes("already exists")) throw error;
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  await bucketReady;
}

export async function uploadProjectFile(path: string, body: Buffer, contentType?: string) {
  await ensureBucket();
  const { error } = await adminClient().storage.from(BUCKET).upload(path, body, {
    contentType: contentType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function ensureBrandBucket() {
  if (!brandBucketReady) {
    brandBucketReady = (async () => {
      const client = adminClient();
      const { data } = await client.storage.getBucket(BRAND_BUCKET);
      if (data) return;
      const { error } = await client.storage.createBucket(BRAND_BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
      });
      if (error && !error.message.toLowerCase().includes("already exists")) throw error;
    })().catch((error) => {
      brandBucketReady = null;
      throw error;
    });
  }
  await brandBucketReady;
}

export async function uploadBrandAsset(input: {
  userId: number;
  filename: string;
  body: Buffer;
  contentType?: string;
}) {
  await ensureBrandBucket();
  const path = `studios/${input.userId}/${Date.now()}_${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const client = adminClient();
  const { error } = await client.storage.from(BRAND_BUCKET).upload(path, input.body, {
    contentType: input.contentType || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  const { data } = client.storage.from(BRAND_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function ensureStoryboardBucket() {
  if (!storyboardBucketReady) {
    storyboardBucketReady = (async () => {
      const client = adminClient();
      const { data } = await client.storage.getBucket(STORYBOARD_BUCKET);
      if (data) return;
      const { error } = await client.storage.createBucket(STORYBOARD_BUCKET, {
        public: true,
        fileSizeLimit: "10MB",
      });
      if (error && !error.message.toLowerCase().includes("already exists")) throw error;
    })().catch((error) => {
      storyboardBucketReady = null;
      throw error;
    });
  }
  await storyboardBucketReady;
}

function imageExtension(contentType?: string) {
  const type = (contentType || "image/png").toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("svg")) return "svg";
  return "png";
}

function getStoryboardStorageProvider() {
  return (process.env.STORYBOARD_STORAGE_PROVIDER || "supabase").trim().toLowerCase();
}

function cleanPublicBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getR2Client() {
  if (!r2Client) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Cloudflare R2 credentials are not configured");
    }
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return r2Client;
}

async function uploadStoryboardFrameToR2(input: {
  userId: number;
  projectId: number;
  shotId: number;
  body: Buffer;
  contentType?: string;
}) {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || "cena-storyboards";
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicBaseUrl) throw new Error("CLOUDFLARE_R2_PUBLIC_URL is required for storyboard previews");

  const ext = imageExtension(input.contentType);
  const path = `${input.userId}/${input.projectId}/${input.shotId}/${Date.now()}_storyboard.${ext}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    Body: input.body,
    ContentType: input.contentType || "image/png",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return { path, publicUrl: `${cleanPublicBaseUrl(publicBaseUrl)}/${path}` };
}

export async function uploadStoryboardFrame(input: {
  userId: number;
  projectId: number;
  shotId: number;
  body: Buffer;
  contentType?: string;
}) {
  if (getStoryboardStorageProvider() === "cloudflare-r2") {
    return uploadStoryboardFrameToR2(input);
  }

  await ensureStoryboardBucket();
  const ext = imageExtension(input.contentType);
  const path = `${input.userId}/${input.projectId}/${input.shotId}/${Date.now()}_storyboard.${ext}`;
  const client = adminClient();
  const { error } = await client.storage.from(STORYBOARD_BUCKET).upload(path, input.body, {
    contentType: input.contentType || "image/png",
    upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from(STORYBOARD_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeProjectFile(path: string) {
  await ensureBucket();
  const { error } = await adminClient().storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function createProjectFileUrl(path: string, expiresInSeconds = 300) {
  await ensureBucket();
  const { data, error } = await adminClient().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export function storageObjectPath(userId: number, projectId: number, filename: string) {
  return `${userId}/${projectId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}
