import type { RequestHandler } from "express";
import { randomBytes } from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { buildIcsEvent } from "../services/icsService.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";
import { renderTransactionalEmail, type TransactionalEmailLocale } from "../services/transactionalEmail.js";
import { SITE_CONFIG } from "@shared/site";

const CONTACT_EMAIL = process.env.SUPPORT_EMAIL || SITE_CONFIG.supportEmail || "cenastudio@atomicmail.io";

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

// Public meeting links carry client PII, so they expire after the event
// (plus a short grace) and can be revoked by cancelling the meeting.
const MEETING_SHARE_GRACE_DAYS = Math.max(0, Number(process.env.MEETING_SHARE_GRACE_DAYS ?? 2));

/** Blocks a public share link for a cancelled or expired meeting. */
export function assertMeetingLinkUsable(meeting: { status: string; startsAt: Date }) {
  if (meeting.status === "cancelled") {
    throw new AppError("Esta reunião foi cancelada.", 410);
  }
  const expiryMs = meeting.startsAt.getTime() + MEETING_SHARE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() > expiryMs) {
    throw new AppError("Este link de reunião expirou.", 410);
  }
}

function meetingIdValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Reunião inválida", 400);
  return BigInt(parsed);
}

function serializeMeeting(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", opportunityId: "opportunity_id",
    startsAt: "starts_at", durationMinutes: "duration_minutes",
    shareToken: "share_token", emailSentAt: "email_sent_at", emailError: "email_error",
    visibleInClientPortal: "visible_in_client_portal",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_email = result.client.email;
    result.client_phone = result.client.phone;
    delete result.client;
  }
  return result;
}

/**
 * Normalizes a phone number for wa.me links, which require the full
 * international number (country code + area code + number, no symbols).
 * Client records are usually typed as "(67) 98417-7594" (local Brazilian
 * format, no country code), so we add "55" when it looks like a bare
 * Brazilian number — 10 digits (landline/old mobile) or 11 (mobile with 9).
 */
function normalizePhoneForWhatsapp(phone: string | null | undefined): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return digits; // already has a country code
  return digits; // too short to be a real number; let wa.me handle/reject it
}

function buildWhatsappLink(phone: string | null | undefined, meetingUrl: string, title: string, startsAt: Date, locale: "pt" | "en" = "pt") {
  const dateStr = startsAt.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = startsAt.toLocaleTimeString(locale === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const text = locale === "en"
    ? `Hi! Confirming our meeting "${title}" on ${dateStr} at ${timeStr}. Add it to your calendar: ${meetingUrl}`
    : `Olá! Confirmando nossa reunião "${title}" em ${dateStr} às ${timeStr}. Adicione à sua agenda: ${meetingUrl}`;
  const digits = normalizePhoneForWhatsapp(phone);
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

interface MeetingEmailCopy {
  invites: string;
  greeting: (name: string) => string;
  confirmed: (title: string) => string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  notesLabel: string;
  calendarNote: string;
  viewDetails: string;
  questions: (signature: string) => string;
  footer: (studioName: string, contactLine: string | null) => string;
  subject: () => string;
}

const MEETING_EMAIL_COPY: Record<"pt" | "en", MeetingEmailCopy> = {
  pt: {
    invites: "convida você para uma reunião",
    greeting: (name) => `Olá, ${name}.`,
    confirmed: (title) => `Confirmamos o agendamento da reunião "${title}".`,
    dateLabel: "Data",
    timeLabel: "Horário",
    locationLabel: "Local",
    notesLabel: "Observações",
    calendarNote: "Anexamos um convite em formato .ics compatível com Google Calendar, Outlook e Apple Calendar.",
    viewDetails: "Ver Detalhes da Reunião",
    questions: (signature) => `Dúvidas? Responda este e-mail ou entre em contato com ${signature}.`,
    footer: (studioName, contactLine) => [studioName, contactLine].filter(Boolean).join("\n"),
    subject: () => "Reunião agendada pelo Cena Studio",
  },
  en: {
    invites: "invites you to a meeting",
    greeting: (name) => `Hi, ${name}.`,
    confirmed: (title) => `We've confirmed the meeting "${title}".`,
    dateLabel: "Date",
    timeLabel: "Time",
    locationLabel: "Location",
    notesLabel: "Notes",
    calendarNote: "We've attached a .ics invite compatible with Google Calendar, Outlook and Apple Calendar.",
    viewDetails: "View Meeting Details",
    questions: (signature) => `Questions? Reply to this email or contact ${signature}.`,
    footer: (studioName, contactLine) => [studioName, contactLine].filter(Boolean).join("\n"),
    subject: () => "Meeting scheduled via Cena Studio",
  },
};

export interface MeetingInvitationEmailInput {
  locale: TransactionalEmailLocale;
  studioName: string;
  studioSignature: string;
  contactLine?: string | null;
  clientName: string;
  meetingTitle: string;
  startsAt: Date;
  location?: string | null;
  notes?: string | null;
  meetingUrl: string;
}

export function renderMeetingInvitationEmail(input: MeetingInvitationEmailInput) {
  const locale = input.locale === "en" ? "en" : "pt";
  const copy = MEETING_EMAIL_COPY[locale];
  const dateStr = input.startsAt.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = input.startsAt.toLocaleTimeString(locale === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const firstName = (input.clientName || "").trim().split(" ")[0] || input.clientName;
  const rendered = renderTransactionalEmail({
    locale,
    eyebrow: copy.invites,
    title: input.meetingTitle,
    greeting: copy.greeting(firstName),
    paragraphs: [
      copy.confirmed(input.meetingTitle),
      copy.calendarNote,
      copy.questions(input.studioSignature),
    ],
    details: [
      { label: copy.dateLabel, value: dateStr },
      { label: copy.timeLabel, value: timeStr },
      ...(input.location ? [{ label: copy.locationLabel, value: input.location }] : []),
      ...(input.notes ? [{ label: copy.notesLabel, value: input.notes }] : []),
    ],
    action: { label: copy.viewDetails, url: input.meetingUrl },
    footer: copy.footer(input.studioName, input.contactLine || null),
  });

  return {
    subject: copy.subject(),
    html: rendered.html,
    text: rendered.text,
  };
}

// List meetings for a client (or all upcoming for the user)
export const listMeetings: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId } = req.query;

    const rows = await prisma.meeting.findMany({
      where: {
        userId: BigInt(userId),
        ...(clientId ? { clientId: BigInt(Number(clientId)) } : {}),
      },
      include: { client: { select: { name: true, email: true, phone: true } } },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
    res.json({ success: true, data: rows.map(serializeMeeting) });
  } catch (e) {
    next(e);
  }
};

// Create a meeting: persists it, generates the .ics, emails the client (best-effort),
// and returns a ready-to-open WhatsApp link so the producer can also send it manually.
export const createMeeting: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, opportunityId, title, location, startsAt, durationMinutes, notes } = req.body;

    if (!clientId) throw new AppError("O ID do cliente é obrigatório", 400);
    if (!title?.trim()) throw new AppError("O título da reunião é obrigatório", 400);
    if (!startsAt) throw new AppError("A data/hora da reunião é obrigatória", 400);

    const startsAtDate = new Date(startsAt);
    if (Number.isNaN(startsAtDate.getTime())) throw new AppError("Data/hora inválida", 400);

    const owner = BigInt(userId);
    const linkedClientId = BigInt(Number(clientId));
    const client = await prisma.client.findFirst({ where: { id: linkedClientId, userId: owner } });
    if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);

    const linkedOpportunityId = opportunityId ? BigInt(Number(opportunityId)) : null;
    if (linkedOpportunityId) {
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: linkedOpportunityId, userId: owner, clientId: linkedClientId },
      });
      if (!opportunity) throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
    }

    const shareToken = randomBytes(24).toString("hex");
    const meeting = await prisma.meeting.create({
      data: {
        userId: owner,
        clientId: linkedClientId,
        opportunityId: linkedOpportunityId,
        title: title.trim(),
        location: location?.trim() || null,
        startsAt: startsAtDate,
        durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : 30,
        notes: notes?.trim() || null,
        shareToken,
      },
    });

    const meetingUrl = `${getClientOrigin()}/meeting/${shareToken}`;
    const owner_ = req.user!;
    const studioSettings = await prisma.studioSetting.findUnique({ where: { userId: owner } });
    const studioName = studioSettings?.studioName || owner_.name || SITE_CONFIG.brandName;
    const studioSignature = studioSettings?.signature || owner_.name || studioName;
    const studioReplyTo = studioSettings?.email?.trim() || CONTACT_EMAIL;
    const studioPhone = studioSettings?.phone?.trim();
    const studioWebsite = studioSettings?.website?.trim();

    // Meeting emails/WhatsApp text follow the organizer's regional language
    // preference — the studio owner's, since the recipient (client) has no
    // language setting of their own in the system.
    const ownerUser = await prisma.user.findUnique({ where: { id: owner }, select: { regionalPrefs: true } });
    const locale: "pt" | "en" = (ownerUser?.regionalPrefs as { locale?: string } | null)?.locale === "en" ? "en" : "pt";

    let emailSentAt: Date | null = null;
    let emailError: string | null = null;

    if (client.email && isEmailConfigured) {
      try {
        const ics = buildIcsEvent({
          uid: `meeting-${meeting.id}@cenastudio`,
          title: meeting.title,
          description: meeting.notes || undefined,
          location: meeting.location || undefined,
          startsAt: startsAtDate,
          durationMinutes: meeting.durationMinutes,
          organizerEmail: studioReplyTo,
          organizerName: studioName,
          attendeeEmail: client.email,
          attendeeName: client.name,
        });

        const contactLine = [studioPhone, studioWebsite].filter(Boolean).join(" · ");
        const email = renderMeetingInvitationEmail({
          locale,
          studioName,
          studioSignature,
          contactLine,
          clientName: client.name,
          meetingTitle: meeting.title,
          startsAt: startsAtDate,
          location: meeting.location,
          notes: meeting.notes,
          meetingUrl,
        });

        await sendEmail({
          to: client.email,
          replyTo: studioReplyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: [{ filename: "reuniao.ics", content: ics, contentType: "text/calendar" }],
        });
        emailSentAt = new Date();
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Erro desconhecido ao enviar email.";
      }

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { emailSentAt, emailError },
      });
    }

    const whatsappUrl = buildWhatsappLink(client.phone, meetingUrl, meeting.title, startsAtDate, locale);

    res.status(201).json({
      success: true,
      data: {
        ...serializeMeeting({ ...meeting, emailSentAt, emailError, client }),
        meeting_url: meetingUrl,
        whatsapp_url: whatsappUrl,
        email_available: Boolean(client.email),
        email_configured: isEmailConfigured,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const deleteMeeting: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await prisma.meeting.deleteMany({
      where: { id: meetingIdValue(req.params.id), userId: BigInt(userId) },
    });
    if (result.count === 0) throw new AppError("Reunião não encontrada ou acesso não autorizado", 404);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    next(e);
  }
};

export const updatePortalVisibility: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { visible } = req.body as { visible?: boolean };
    if (typeof visible !== "boolean") throw new AppError("Visible flag is required", 400);

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingIdValue(req.params.id), userId: BigInt(userId) },
      select: { id: true, status: true },
    });
    if (!meeting) throw new AppError("Reunião não encontrada ou acesso não autorizado", 404);
    if (visible && meeting.status === "cancelled") {
      throw new AppError("Uma reunião cancelada não pode ser liberada no portal.", 409);
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { visibleInClientPortal: visible },
      include: { client: { select: { name: true, email: true, phone: true } } },
    });
    res.json({ success: true, data: serializeMeeting(updated) });
  } catch (e) {
    next(e);
  }
};

// Cancel a meeting (owner only): revokes the public link immediately.
export const cancelMeeting: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await prisma.meeting.updateMany({
      where: { id: meetingIdValue(req.params.id), userId: BigInt(userId) },
      data: { status: "cancelled", visibleInClientPortal: false },
    });
    if (result.count === 0) throw new AppError("Reunião não encontrada ou acesso não autorizado", 404);
    res.json({ success: true, data: { id: Number(req.params.id), status: "cancelled" } });
  } catch (e) {
    next(e);
  }
};

// Public: fetch meeting details + downloadable .ics by share token (no auth).
export const getPublicMeeting: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const meeting = await prisma.meeting.findUnique({
      where: { shareToken: token },
      include: {
        client: { select: { name: true } },
        owner: { select: { id: true, name: true, studioName: true } },
      },
    });
    if (!meeting) throw new AppError("Reunião não encontrada", 404);
    assertMeetingLinkUsable(meeting);
    const studioSettings = await prisma.studioSetting.findUnique({ where: { userId: meeting.owner.id } });

    res.json({
      success: true,
      data: {
        title: meeting.title,
        location: meeting.location,
        starts_at: meeting.startsAt.toISOString(),
        duration_minutes: meeting.durationMinutes,
        notes: meeting.notes,
        client_name: meeting.client.name,
        studio_name: studioSettings?.studioName || meeting.owner.studioName || meeting.owner.name || SITE_CONFIG.brandName,
      },
    });
  } catch (e) {
    next(e);
  }
};

// Public: download the .ics file by share token (no auth).
export const downloadPublicMeetingIcs: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const meeting = await prisma.meeting.findUnique({
      where: { shareToken: token },
      include: {
        client: { select: { name: true, email: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    if (!meeting) throw new AppError("Reunião não encontrada", 404);
    assertMeetingLinkUsable(meeting);
    const studioSettings = await prisma.studioSetting.findUnique({ where: { userId: meeting.owner.id } });
    const studioName = studioSettings?.studioName || meeting.owner.name || SITE_CONFIG.brandName;
    const studioReplyTo = studioSettings?.email?.trim() || CONTACT_EMAIL;

    const ics = buildIcsEvent({
      uid: `meeting-${meeting.id}@cenastudio`,
      title: meeting.title,
      description: meeting.notes || undefined,
      location: meeting.location || undefined,
      startsAt: meeting.startsAt,
      durationMinutes: meeting.durationMinutes,
      organizerEmail: studioReplyTo,
      organizerName: studioName,
      attendeeEmail: meeting.client.email || undefined,
      attendeeName: meeting.client.name,
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"reuniao.ics\"");
    res.send(ics);
  } catch (e) {
    next(e);
  }
};
