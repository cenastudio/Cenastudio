import type { RequestHandler } from "express";
import { randomBytes } from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { buildIcsEvent } from "../services/icsService.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";
import { SITE_CONFIG } from "@shared/site";

const CONTACT_EMAIL = process.env.SUPPORT_EMAIL || SITE_CONFIG.supportEmail || "cenastudio@atomicmail.io";

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
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

function buildWhatsappLink(phone: string | null | undefined, meetingUrl: string, title: string, startsAt: Date) {
  const dateStr = startsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const text = `Olá! Confirmando nossa reunião "${title}" em ${dateStr} às ${timeStr}. Adicione à sua agenda: ${meetingUrl}`;
  const digits = normalizePhoneForWhatsapp(phone);
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
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
    const brandColor = studioSettings?.primaryColor || SITE_CONFIG.primaryColor;

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

        const dateStr = startsAtDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timeStr = startsAtDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        const firstName = (client.name || "").trim().split(" ")[0] || client.name;

        const contactLine = [studioPhone, studioWebsite].filter(Boolean).join(" · ");

        await sendEmail({
          to: client.email,
          replyTo: studioReplyTo,
          subject: `Reunião agendada com ${studioName}: ${meeting.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <p style="color: ${brandColor}; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">${studioName}</p>
              <p>Olá, ${firstName}!</p>
              <p>Sua reunião <strong>${meeting.title}</strong> com <strong>${studioName}</strong> foi agendada:</p>
              <table style="margin: 16px 0; border-collapse: collapse;">
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Data</td><td style="padding: 4px 0;"><strong>${dateStr}</strong></td></tr>
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Horário</td><td style="padding: 4px 0;"><strong>${timeStr}</strong></td></tr>
                ${meeting.location ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Local/Link</td><td style="padding: 4px 0;">${meeting.location}</td></tr>` : ""}
              </table>
              <p>Anexamos um arquivo de convite (.ics) para adicionar este evento à sua agenda (Google, Outlook, Apple Calendar).</p>
              <p>Qualquer dúvida, responda este email${studioSignature ? ` — ${studioSignature}` : ""}.</p>
              ${contactLine ? `<p style="color: #999; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">${studioName} · ${contactLine}</p>` : ""}
            </div>
          `,
          text: `Reunião agendada com ${studioName}: ${meeting.title} em ${dateStr} às ${timeStr}.`,
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

    const whatsappUrl = buildWhatsappLink(client.phone, meetingUrl, meeting.title, startsAtDate);

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
