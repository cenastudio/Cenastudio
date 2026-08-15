import { SITE_CONFIG } from "@shared/site";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

export type PublicShareKind = "review" | "proposal" | "meeting";
export type PublicShareLocale = "pt" | "en";

export interface PublicShareMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: "noindex, nofollow, noarchive";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PUBLIC_ORIGIN = "https://cena-studio-prod.vercel.app";
const ROBOTS: PublicShareMetadata["robots"] = "noindex, nofollow, noarchive";

const COPY: Record<PublicShareLocale, Record<PublicShareKind, { label: string; description: string }>> = {
  pt: {
    review: {
      label: "Revisao de video",
      description: "Assista ao video e envie seus comentarios nesta revisao.",
    },
    proposal: {
      label: "Proposta",
      description: "Consulte os detalhes e responda a esta proposta online.",
    },
    meeting: {
      label: "Reuniao",
      description: "Confira os detalhes desta reuniao e adicione ao seu calendario.",
    },
  },
  en: {
    review: {
      label: "Video review",
      description: "Watch the video and share your feedback in this review.",
    },
    proposal: {
      label: "Proposal",
      description: "Review the details and respond to this proposal online.",
    },
    meeting: {
      label: "Meeting",
      description: "See the details of this meeting and add it to your calendar.",
    },
  },
};

const GENERIC_COPY: Record<PublicShareLocale, { title: string; description: string }> = {
  pt: {
    title: "Conteudo compartilhado",
    description: "Abra este link compartilhado no Cena Studio.",
  },
  en: {
    title: "Shared content",
    description: "Open this shared link in Cena Studio.",
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function getPublicOrigin(value?: string) {
  try {
    return new URL(value || DEFAULT_PUBLIC_ORIGIN).origin;
  } catch {
    return DEFAULT_PUBLIC_ORIGIN;
  }
}

function truncateDescription(value: string) {
  return value.slice(0, 160);
}

export function getPublicShareLocale(acceptLanguage?: string): PublicShareLocale {
  return acceptLanguage?.toLowerCase().startsWith("en") ? "en" : "pt";
}

export function isPublicShareKind(value: unknown): value is PublicShareKind {
  return value === "review" || value === "proposal" || value === "meeting";
}

export function isSafePublicShareToken(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 16
    && value.length <= 4096
    && /^[A-Za-z0-9._~-]+$/.test(value);
}

export function isReviewShareUsable(review: { expiresAt: Date | null }, now = new Date()) {
  return !review.expiresAt || review.expiresAt >= now;
}

export function isProposalShareUsable(
  proposal: { status: string; createdAt: Date },
  now = new Date(),
  ttlDays = Math.max(1, Number(process.env.PROPOSAL_SHARE_TTL_DAYS ?? 90)),
) {
  return proposal.status !== "revoked"
    && (proposal.status === "accepted" || proposal.createdAt.getTime() + ttlDays * DAY_MS >= now.getTime());
}

export function isMeetingShareUsable(
  meeting: { status: string; startsAt: Date },
  now = new Date(),
  graceDays = Math.max(0, Number(process.env.MEETING_SHARE_GRACE_DAYS ?? 2)),
) {
  return meeting.status !== "cancelled"
    && meeting.startsAt.getTime() + graceDays * DAY_MS >= now.getTime();
}

export function buildPublicShareMetadata({
  kind,
  title,
  path,
  locale = "pt",
  publicOrigin,
  brandName = SITE_CONFIG.brandName,
}: {
  kind: PublicShareKind;
  title: string;
  path: string;
  locale?: PublicShareLocale;
  publicOrigin?: string;
  brandName?: string;
}): PublicShareMetadata {
  const copy = COPY[locale][kind];
  const canonicalUrl = new URL(path, getPublicOrigin(publicOrigin)).toString();

  return {
    title: `${title} | ${copy.label} | ${brandName}`,
    description: truncateDescription(copy.description),
    canonicalUrl,
    robots: ROBOTS,
  };
}

export function buildGenericPublicShareMetadata({
  locale,
  publicOrigin,
  brandName = SITE_CONFIG.brandName,
}: {
  locale: PublicShareLocale;
  publicOrigin?: string;
  brandName?: string;
}): PublicShareMetadata {
  const copy = GENERIC_COPY[locale];

  return {
    title: `${copy.title} | ${brandName}`,
    description: copy.description,
    canonicalUrl: new URL("/", getPublicOrigin(publicOrigin)).toString(),
    robots: ROBOTS,
  };
}

export function renderPublicShareHtml(html: string, metadata: PublicShareMetadata) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonicalUrl = escapeHtml(metadata.canonicalUrl);
  const robots = escapeHtml(metadata.robots);

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${description}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${robots}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`)
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/i, "");
}

export async function getPublicShareMetadata(
  kind: PublicShareKind,
  token: string,
  locale: PublicShareLocale,
) {
  if (!isSafePublicShareToken(token) || !shouldUsePrisma) return null;

  const path = `/${kind}/${encodeURIComponent(token)}`;
  const publicOrigin = process.env.VITE_PUBLIC_URL || process.env.CLIENT_ORIGIN;
  const now = new Date();

  if (kind === "review") {
    const review = await prisma.videoReview.findUnique({
      where: { shareToken: token },
      select: { title: true, expiresAt: true },
    });
    if (!review || !isReviewShareUsable(review, now)) return null;
    return buildPublicShareMetadata({ kind, title: review.title, path, locale, publicOrigin });
  }

  if (kind === "proposal") {
    const proposal = await prisma.proposal.findUnique({
      where: { shareToken: token },
      select: { title: true, status: true, createdAt: true },
    });
    if (!proposal || !isProposalShareUsable(proposal, now)) return null;
    return buildPublicShareMetadata({ kind, title: proposal.title, path, locale, publicOrigin });
  }

  const meeting = await prisma.meeting.findUnique({
    where: { shareToken: token },
    select: { title: true, status: true, startsAt: true },
  });
  if (!meeting || !isMeetingShareUsable(meeting, now)) return null;
  return buildPublicShareMetadata({ kind, title: meeting.title, path, locale, publicOrigin });
}
