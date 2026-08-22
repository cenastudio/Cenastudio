import { beforeEach, describe, expect, it, vi } from "vitest";

const storageState = vi.hoisted(() => ({
  getBucket: vi.fn(),
  createBucket: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  getPublicUrl: vi.fn(),
}));

const s3State = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      getBucket: storageState.getBucket,
      createBucket: storageState.createBucket,
      from: vi.fn(() => ({
        upload: storageState.upload,
        remove: storageState.remove,
        createSignedUrl: storageState.createSignedUrl,
        getPublicUrl: storageState.getPublicUrl,
      })),
    },
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn((input) => ({ kind: "PutObjectCommand", input })),
  S3Client: vi.fn(() => ({ send: s3State.send })),
}));

describe("supabaseStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "project-files-test";
    delete process.env.STORYBOARD_STORAGE_PROVIDER;
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.CLOUDFLARE_R2_BUCKET;
    delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
    storageState.getBucket.mockResolvedValue({ data: null });
    storageState.createBucket.mockResolvedValue({ error: null });
    storageState.upload.mockResolvedValue({ error: null });
    storageState.remove.mockResolvedValue({ error: null });
    storageState.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/file" }, error: null });
    storageState.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://public.example/logo.png" } });
    s3State.send.mockResolvedValue({});
  });

  it("sanitizes object paths", async () => {
    const { storageObjectPath } = await import("./supabaseStorage.js");
    const path = storageObjectPath(7, 9, "Cena Final?.mp4");
    expect(path).toMatch(/^7\/9\/\d+_Cena_Final_.mp4$/);
  });

  it("creates private bucket once and uploads/removes/signs files", async () => {
    const storage = await import("./supabaseStorage.js");

    await expect(storage.uploadProjectFile("7/9/file.txt", Buffer.from("ok"), "text/plain"))
      .resolves.toBe("7/9/file.txt");
    await storage.removeProjectFile("7/9/file.txt");
    await expect(storage.createProjectFileUrl("7/9/file.txt")).resolves.toBe("https://signed.example/file");

    expect(storageState.createBucket).toHaveBeenCalledTimes(1);
    expect(storageState.upload).toHaveBeenCalledWith("7/9/file.txt", expect.any(Buffer), {
      contentType: "text/plain",
      upsert: false,
    });
    expect(storageState.remove).toHaveBeenCalledWith(["7/9/file.txt"]);
    expect(storageState.createSignedUrl).toHaveBeenCalledWith("7/9/file.txt", 300);
  });

  it("fails fast when credentials are absent", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storage = await import("./supabaseStorage.js");
    await expect(storage.uploadProjectFile("file.txt", Buffer.from("ok"))).rejects.toThrow("credentials");
  });

  it("uploads brand assets to the public branding bucket", async () => {
    process.env.SUPABASE_BRANDING_BUCKET = "studio-branding-test";
    const storage = await import("./supabaseStorage.js");

    await expect(storage.uploadBrandAsset({
      userId: 7,
      filename: "Logo Final?.png",
      body: Buffer.from("logo"),
      contentType: "image/png",
    })).resolves.toMatchObject({
      publicUrl: "https://public.example/logo.png",
    });

    expect(storageState.createBucket).toHaveBeenCalledWith("studio-branding-test", {
      public: true,
      fileSizeLimit: "5MB",
    });
    expect(storageState.upload).toHaveBeenCalledWith(expect.stringMatching(/^studios\/7\/\d+_Logo_Final_.png$/), expect.any(Buffer), {
      contentType: "image/png",
      upsert: true,
    });
    expect(storageState.getPublicUrl).toHaveBeenCalledWith(expect.stringMatching(/^studios\/7\/\d+_Logo_Final_.png$/));
  });

  it("uploads storyboard frames to a public storyboard bucket", async () => {
    process.env.SUPABASE_STORYBOARD_BUCKET = "storyboards-test";
    storageState.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://public.example/storyboard.png" } });
    const storage = await import("./supabaseStorage.js");

    await expect(storage.uploadStoryboardFrame({
      userId: 7,
      projectId: 9,
      shotId: 11,
      body: Buffer.from("image"),
      contentType: "image/webp",
    })).resolves.toMatchObject({
      publicUrl: "https://public.example/storyboard.png",
    });

    expect(storageState.createBucket).toHaveBeenCalledWith("storyboards-test", {
      public: true,
      fileSizeLimit: "10MB",
    });
    expect(storageState.upload).toHaveBeenCalledWith(expect.stringMatching(/^7\/9\/11\/\d+_storyboard\.webp$/), expect.any(Buffer), {
      contentType: "image/webp",
      upsert: false,
    });
    expect(storageState.getPublicUrl).toHaveBeenCalledWith(expect.stringMatching(/^7\/9\/11\/\d+_storyboard\.webp$/));
  });

  it("uploads storyboard frames to Cloudflare R2 when selected", async () => {
    process.env.STORYBOARD_STORAGE_PROVIDER = "cloudflare-r2";
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = "account-id";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "access-key";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "secret-key";
    process.env.CLOUDFLARE_R2_BUCKET = "cena-storyboards";
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://assets.cenastudio.dev/storyboards/";
    const storage = await import("./supabaseStorage.js");

    await expect(storage.uploadStoryboardFrame({
      userId: 7,
      projectId: 9,
      shotId: 11,
      body: Buffer.from("image"),
      contentType: "image/png",
    })).resolves.toMatchObject({
      path: expect.stringMatching(/^7\/9\/11\/\d+_storyboard\.png$/),
      publicUrl: expect.stringMatching(/^https:\/\/assets\.cenastudio\.dev\/storyboards\/7\/9\/11\/\d+_storyboard\.png$/),
    });

    expect(s3State.send).toHaveBeenCalledWith(expect.objectContaining({
      kind: "PutObjectCommand",
      input: expect.objectContaining({
        Bucket: "cena-storyboards",
        Key: expect.stringMatching(/^7\/9\/11\/\d+_storyboard\.png$/),
        ContentType: "image/png",
      }),
    }));
  });
});
