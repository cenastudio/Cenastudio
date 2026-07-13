import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";

interface StorageStatsByType {
  images: number;
  videos: number;
  documents: number;
  audio: number;
  other: number;
}

interface TopFile {
  id: number;
  name: string;
  size: number;
  project: string;
  projectId: number | null;
}

interface StorageStats {
  totalUsed: number;
  quota: number;
  byType: StorageStatsByType;
  topFiles: TopFile[];
  fileCount: number;
}

/**
 * Calculate storage statistics for a user
 * @param userId - User ID to calculate stats for
 * @returns Storage statistics including total used, by type, and top files
 */
export async function calculateStorageStats(userId: number): Promise<StorageStats> {
  // 1. Get total storage used
  const totalResult = await prisma.file.aggregate({
    where: { userId: BigInt(userId) },
    _sum: { size: true },
    _count: true,
  });

  const totalUsed = Number(totalResult._sum.size || 0);
  const fileCount = totalResult._count;

  // 2. Get storage by mime type
  const filesByType = await prisma.file.groupBy({
    by: ["mimeType"],
    where: { userId: BigInt(userId) },
    _sum: { size: true },
  });

  // 3. Categorize by type
  const byType: StorageStatsByType = {
    images: 0,
    videos: 0,
    documents: 0,
    audio: 0,
    other: 0,
  };

  filesByType.forEach((item) => {
    const size = Number(item._sum.size || 0);
    const mime = (item.mimeType || "").toLowerCase();


    if (mime.startsWith("image/")) {
      byType.images += size;
    } else if (mime.startsWith("video/")) {
      byType.videos += size;
    } else if (mime.startsWith("audio/")) {
      byType.audio += size;
    } else if (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("spreadsheet") ||
      mime.includes("presentation") ||
      mime.startsWith("text/")
    ) {
      byType.documents += size;
    } else {
      byType.other += size;
    }
  });

  // 4. Get top 10 largest files
  const topFilesRaw = await prisma.file.findMany({
    where: { userId: BigInt(userId) },
    orderBy: { size: "desc" },
    take: 10,
    include: {
      project: {
        select: { name: true },
      },
    },
  });

  const topFiles: TopFile[] = topFilesRaw.map((file) => ({
    id: Number(file.id),
    name: file.originalName,
    size: file.size || 0,
    project: file.project?.name || "Sem projeto",
    projectId: file.projectId ? Number(file.projectId) : null,
  }));

  // 5. Get storage quota (based on plan - hardcoded for now, can be fetched from user.plan later)
  // TODO: Integrate with plan service to get actual quota
  const quota = 10 * 1024 * 1024 * 1024; // 10GB for Pro plan

  return {
    totalUsed,
    quota,
    byType,
    topFiles,
    fileCount,
  };
}

/**
 * Calculate storage statistics by project
 * @param projectId - Project ID to calculate stats for
 * @param userId - User ID (for authorization)
 * @returns Storage statistics for the project
 */
export async function calculateProjectStorageStats(
  projectId: number,
  userId: number
): Promise<Omit<StorageStats, "quota">> {
  // Verify user has access to project
  const project = await prisma.project.findFirst({
    where: {
      id: BigInt(projectId),
      userId: BigInt(userId),
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  // Calculate stats for this project
  const totalResult = await prisma.file.aggregate({
    where: {
      projectId: BigInt(projectId),
      userId: BigInt(userId),
    },
    _sum: { size: true },
    _count: true,
  });

  const totalUsed = Number(totalResult._sum.size || 0);
  const fileCount = totalResult._count;

  // Get files by type
  const filesByType = await prisma.file.groupBy({
    by: ["mimeType"],
    where: {
      projectId: BigInt(projectId),
      userId: BigInt(userId),
    },
    _sum: { size: true },
  });

  const byType: StorageStatsByType = {
    images: 0,
    videos: 0,
    documents: 0,
    audio: 0,
    other: 0,
  };

  filesByType.forEach((item) => {
    const size = Number(item._sum.size || 0);
    const mime = (item.mimeType || "").toLowerCase();

    if (mime.startsWith("image/")) {
      byType.images += size;
    } else if (mime.startsWith("video/")) {
      byType.videos += size;
    } else if (mime.startsWith("audio/")) {
      byType.audio += size;
    } else if (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("spreadsheet") ||
      mime.includes("presentation") ||
      mime.startsWith("text/")
    ) {
      byType.documents += size;
    } else {
      byType.other += size;
    }
  });

  // Get top files for this project
  const topFilesRaw = await prisma.file.findMany({
    where: {
      projectId: BigInt(projectId),
      userId: BigInt(userId),
    },
    orderBy: { size: "desc" },
    take: 10,
  });

  const topFiles: TopFile[] = topFilesRaw.map((file) => ({
    id: Number(file.id),
    name: file.originalName,
    size: file.size || 0,
    project: project.name,
    projectId: Number(projectId),
  }));

  return {
    totalUsed,
    quota: 0, // Not applicable for project-level stats
    byType,
    topFiles,
    fileCount,
  };
}
