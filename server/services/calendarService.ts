import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { buildIcsCalendar, type IcsEventInput } from "./icsService.js";
import { google, type calendar_v3 } from "googleapis";
import crypto from "node:crypto";

/**
 * Google Calendar / Agenda export (spec: landing-features-implementation, F5).
 *
 * MVP scope: one-way .ics export (RFC 5545), not OAuth sync — the project's
 * deadline plus meetings linked to the project's client are combined into a
 * single downloadable calendar file. There is no direct meeting->project
 * link in the schema (meetings are scoped to a client), so meetings are
 * included via the project's clientId — the closest available association.
 */

interface ProjectScheduleRow {
  id: number;
  name: string;
  deadline: string | null;
  client_id: number | null;
}

interface MeetingRow {
  id: number;
  title: string;
  location: string | null;
  starts_at: string;
  duration_minutes: number;
  notes: string | null;
}

export interface GoogleCalendarConnection {
  connected: boolean;
  email: string | null;
}

function googleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function assertGoogleCalendarConfigured() {
  if (!googleCalendarConfigured()) {
    throw new AppError("Google Calendar ainda não está configurado neste ambiente.", 503);
  }
}

function getOAuthClient() {
  assertGoogleCalendarConfigured();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function stateSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError("JWT_SECRET não configurado para OAuth state.", 503);
  return secret;
}

function signState(payload: string) {
  return crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createGoogleOAuthState(userId: number) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    nonce: crypto.randomBytes(12).toString("base64url"),
    ts: Date.now(),
  })).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function verifyGoogleOAuthState(state: string): { userId: number } {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signState(payload) !== signature) throw new AppError("Estado OAuth inválido", 400);
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: unknown; ts?: unknown };
  if (typeof decoded.userId !== "number" || typeof decoded.ts !== "number") throw new AppError("Estado OAuth inválido", 400);
  if (Date.now() - decoded.ts > 10 * 60_000) throw new AppError("Estado OAuth expirado", 400);
  return { userId: decoded.userId };
}

async function getOwnedProjectForSchedule(userId: number, projectId: number): Promise<ProjectScheduleRow> {
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({
      where: { id: BigInt(projectId), userId: BigInt(userId) },
      select: { id: true, name: true, deadline: true, clientId: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404);
    return {
      id: Number(project.id),
      name: project.name,
      deadline: project.deadline ? project.deadline.toISOString() : null,
      client_id: project.clientId != null ? Number(project.clientId) : null,
    };
  }

  const project = db
    .prepare("SELECT id, name, deadline, client_id FROM projects WHERE id = ? AND user_id = ?")
    .get(projectId, userId) as ProjectScheduleRow | undefined;
  if (!project) throw new AppError("Projeto não encontrado", 404);
  return project;
}

async function listMeetingsForClient(userId: number, clientId: number): Promise<MeetingRow[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.meeting.findMany({
      where: { userId: BigInt(userId), clientId: BigInt(clientId) },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, location: true, startsAt: true, durationMinutes: true, notes: true },
    });
    return rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      location: row.location,
      starts_at: row.startsAt.toISOString(),
      duration_minutes: row.durationMinutes,
      notes: row.notes,
    }));
  }

  const rows = db
    .prepare(
      "SELECT id, title, location, starts_at, duration_minutes, notes FROM meetings WHERE user_id = ? AND client_id = ? ORDER BY starts_at ASC",
    )
    .all(userId, clientId);
  return rows as MeetingRow[];
}

async function buildProjectScheduleEvents(userId: number, projectId: number): Promise<{ project: ProjectScheduleRow; events: IcsEventInput[] }> {
  const project = await getOwnedProjectForSchedule(userId, projectId);
  const events: IcsEventInput[] = [];

  if (project.deadline) {
    events.push({
      uid: `project-${project.id}-deadline@cenastudio`,
      title: `Prazo final — ${project.name}`,
      description: `Deadline do projeto "${project.name}".`,
      startsAt: new Date(project.deadline),
      durationMinutes: 60,
    });
  }

  if (project.client_id != null) {
    const meetings = await listMeetingsForClient(userId, project.client_id);
    for (const meeting of meetings) {
      events.push({
        uid: `meeting-${meeting.id}@cenastudio`,
        title: meeting.title,
        description: meeting.notes ?? undefined,
        location: meeting.location ?? undefined,
        startsAt: new Date(meeting.starts_at),
        durationMinutes: meeting.duration_minutes,
      });
    }
  }

  if (events.length === 0) {
    throw new AppError("Este projeto não tem prazo ou reuniões para exportar.", 404);
  }
  return { project, events };
}

/**
 * Builds the .ics file contents for a project's schedule (deadline + linked
 * meetings). Throws 404 if there are no events to export — an empty file is
 * silently useless and would look like a bug, not "no data" (Req 5.3).
 */
export async function buildProjectScheduleIcs(userId: number, projectId: number): Promise<{ filename: string; content: string }> {
  const { project, events } = await buildProjectScheduleEvents(userId, projectId);

  const content = buildIcsCalendar(events);
  const safeName = project.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return { filename: `cronograma-${safeName}.ics`, content };
}

export async function getGoogleCalendarConnection(userId: number): Promise<GoogleCalendarConnection> {
  if (!shouldUsePrisma) return { connected: false, email: null };
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { googleRefreshToken: true, googleCalendarEmail: true },
  });
  return { connected: Boolean(user?.googleRefreshToken), email: user?.googleCalendarEmail ?? null };
}

export function getGoogleAuthUrl(userId: number) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events", "openid", "email"],
    state: createGoogleOAuthState(userId),
  });
}

export async function handleGoogleCallback(code: string, state: string) {
  if (!shouldUsePrisma) throw new AppError("Google Calendar exige Postgres persistente.", 503);
  const { userId } = verifyGoogleOAuthState(state);
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !tokens.access_token) throw new AppError("Google não retornou tokens OAuth.", 400);
  client.setCredentials(tokens);
  let googleEmail: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    googleEmail = profile.data.email ?? null;
  } catch {
    googleEmail = null;
  }

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? undefined,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleCalendarEmail: googleEmail,
    },
  });
  return { userId, email: googleEmail };
}

async function authorizedGoogleClient(userId: number) {
  if (!shouldUsePrisma) throw new AppError("Google Calendar exige Postgres persistente.", 503);
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });
  if (!user?.googleRefreshToken && !user?.googleAccessToken) {
    throw new AppError("Google Calendar não conectado.", 409);
  }
  const client = getOAuthClient();
  client.setCredentials({
    access_token: user.googleAccessToken ?? undefined,
    refresh_token: user.googleRefreshToken ?? undefined,
    expiry_date: user.googleTokenExpiry?.getTime(),
  });
  client.on("tokens", async (tokens) => {
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        googleAccessToken: tokens.access_token ?? undefined,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });
  return client;
}

function toGoogleEvent(event: IcsEventInput): calendar_v3.Schema$Event {
  const end = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startsAt.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

export async function syncProjectScheduleToGoogle(userId: number, projectId: number) {
  if (!shouldUsePrisma) throw new AppError("Google Calendar exige Postgres persistente.", 503);
  const { project, events } = await buildProjectScheduleEvents(userId, projectId);
  const auth = await authorizedGoogleClient(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const synced = [];

  for (const event of events) {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: toGoogleEvent(event),
    });
    const googleEvent = response.data;
    if (!googleEvent.id) continue;
    const endsAt = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);
    const saved = await prisma.calendarEvent.upsert({
      where: { userId_googleEventId: { userId: BigInt(userId), googleEventId: googleEvent.id } },
      update: {
        htmlLink: googleEvent.htmlLink ?? null,
        title: event.title,
        startsAt: event.startsAt,
        endsAt,
      },
      create: {
        userId: BigInt(userId),
        projectId: BigInt(project.id),
        googleEventId: googleEvent.id,
        htmlLink: googleEvent.htmlLink ?? null,
        title: event.title,
        startsAt: event.startsAt,
        endsAt,
      },
    });
    synced.push({ id: Number(saved.id), googleEventId: saved.googleEventId, htmlLink: saved.htmlLink, title: saved.title });
  }

  return { projectId: project.id, synced };
}

export async function revokeGoogleCalendar(userId: number) {
  if (!shouldUsePrisma) return;
  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarEmail: null,
    },
  });
}
