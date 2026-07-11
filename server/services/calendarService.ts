import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { buildIcsCalendar, type IcsEventInput } from "./icsService.js";

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

/**
 * Builds the .ics file contents for a project's schedule (deadline + linked
 * meetings). Throws 404 if there are no events to export — an empty file is
 * silently useless and would look like a bug, not "no data" (Req 5.3).
 */
export async function buildProjectScheduleIcs(userId: number, projectId: number): Promise<{ filename: string; content: string }> {
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

  const content = buildIcsCalendar(events);
  const safeName = project.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return { filename: `cronograma-${safeName}.ics`, content };
}
