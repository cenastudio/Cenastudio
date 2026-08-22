import { beforeEach, describe, expect, it, vi } from "vitest";

const storageState = vi.hoisted(() => ({
  getBucket: vi.fn(),
  createBucket: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  getPublicUrl: vi.fn(),
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

describe("supabaseStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "project-files-test";
    storageState.getBucket.mockResolvedValue({ data: null });
    storageState.createBucket.mockResolvedValue({ error: null });
    storageState.upload.mockResolvedValue({ error: null });
    storageState.remove.mockResolvedValue({ error: null });
    storageState.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/file" }, error: null });
    storageState.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://public.example/logo.png" } });
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
});
