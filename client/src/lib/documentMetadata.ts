export interface DocumentMetadata {
  title: string;
  description: string;
  path: string;
  robots: string;
  publicUrl?: string;
}

function getOrCreateMeta(attribute: "name" | "property", value: string) {
  const selector = `meta[${attribute}="${value}"]`;
  const existing = document.querySelector<HTMLMetaElement>(selector);
  if (existing) return existing;

  const meta = document.createElement("meta");
  meta.setAttribute(attribute, value);
  document.head.append(meta);
  return meta;
}

function getOrCreateCanonical() {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) return existing;

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  document.head.append(canonical);
  return canonical;
}

function resolvePublicUrl(explicitPublicUrl?: string) {
  const configuredUrl = explicitPublicUrl || import.meta.env.VITE_PUBLIC_URL?.trim();
  return (configuredUrl || window.location.origin).replace(/\/$/, "");
}

/** Updates the single document-level SEO surface used by public and app routes. */
export function applyDocumentMetadata({ title, description, path, robots, publicUrl }: DocumentMetadata) {
  if (typeof document === "undefined") return;

  const canonicalUrl = `${resolvePublicUrl(publicUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  document.title = title;

  getOrCreateMeta("name", "description").content = description;
  getOrCreateMeta("name", "robots").content = robots;
  getOrCreateMeta("property", "og:title").content = title;
  getOrCreateMeta("property", "og:description").content = description;
  getOrCreateMeta("property", "og:url").content = canonicalUrl;
  getOrCreateMeta("name", "twitter:title").content = title;
  getOrCreateMeta("name", "twitter:description").content = description;
  getOrCreateCanonical().href = canonicalUrl;
}
