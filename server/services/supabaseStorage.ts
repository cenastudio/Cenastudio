import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "project-files";
const BRAND_BUCKET = process.env.SUPABASE_BRANDING_BUCKET || "studio-branding";

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let bucketReady: Promise<void> | null = null;
let brandBucketReady: Promise<void> | null = null;

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
