import type { ShotItem } from "@/lib/api";

/**
 * Grouping logic for the Shot List "by scene" view (spec: shot list
 * improvements, step 2). Pure functions — no DOM, no drag gestures — so the
 * non-trivial part of drag-between-groups (recomputing scene + order) can be
 * covered by unit tests without simulating pointer/touch events.
 */

export const UNASSIGNED_SCENE = "__unassigned__";

export interface ShotGroup {
  /** Scene identifier. UNASSIGNED_SCENE for shots with no scene set. */
  scene: string;
  shots: ShotItem[];
  /** Sum of duration_sec across shots in this scene (nulls treated as 0). */
  totalDurationSec: number;
}

/**
 * Groups shots by their `scene` field, preserving each shot's relative
 * order within its group. Groups are ordered by the first appearance of
 * each scene in the input array (i.e. respects reorderShots' persisted
 * order_index), with shots missing a scene collected into a single
 * UNASSIGNED_SCENE group placed last.
 */
export function groupShotsByScene(shots: ShotItem[]): ShotGroup[] {
  const order: string[] = [];
  const byScene = new Map<string, ShotItem[]>();

  for (const shot of shots) {
    const scene = shot.scene?.trim() || UNASSIGNED_SCENE;
    if (!byScene.has(scene)) {
      byScene.set(scene, []);
      order.push(scene);
    }
    byScene.get(scene)!.push(shot);
  }

  // Unassigned group (if present) always goes last, regardless of when it
  // first appeared in the input — shots without a scene shouldn't interrupt
  // the narrative order of scenes that do have one.
  const orderedScenes = [
    ...order.filter((scene) => scene !== UNASSIGNED_SCENE),
    ...order.filter((scene) => scene === UNASSIGNED_SCENE),
  ];

  return orderedScenes.map((scene) => {
    const groupShots = byScene.get(scene)!;
    return {
      scene,
      shots: groupShots,
      totalDurationSec: groupShots.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0),
    };
  });
}

/** Total duration across every shot, regardless of grouping. */
export function totalDurationSec(shots: ShotItem[]): number {
  return shots.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

/**
 * Flattens groups back into a single ordered list (groups in their given
 * order, shots in their given order within each group) — used to compute
 * the full reorder payload sent to the backend after a drag between/within
 * groups, since the API persists a single flat order_index sequence.
 */
export function flattenGroups(groups: ShotGroup[]): ShotItem[] {
  return groups.flatMap((g) => g.shots);
}

/**
 * Moves a shot identified by `activeId` to a new position, either within
 * its current group (newScene === current scene) or into a different group
 * (newScene !== current scene, e.g. dragged into another scene's drop
 * zone). `overId` is the shot to place before (or null/undefined to append
 * at the end of the target group). Returns a new groups array; does not
 * mutate the input.
 */
export function moveShotBetweenGroups(
  groups: ShotGroup[],
  activeId: number,
  targetScene: string,
  overId: number | null,
): ShotGroup[] {
  const sourceGroupIndex = groups.findIndex((g) => g.shots.some((s) => s.id === activeId));
  if (sourceGroupIndex === -1) return groups;

  const sourceGroup = groups[sourceGroupIndex];
  const activeShot = sourceGroup.shots.find((s) => s.id === activeId)!;
  const withoutActive = sourceGroup.shots.filter((s) => s.id !== activeId);

  const targetGroupIndex = groups.findIndex((g) => g.scene === targetScene);
  if (targetGroupIndex === -1) return groups;

  // Build the new groups array, replacing source and target group contents.
  const next = groups.map((g, i) => {
    if (i === sourceGroupIndex && i === targetGroupIndex) return g; // handled below
    if (i === sourceGroupIndex) return { ...g, shots: withoutActive };
    return g;
  });

  const updatedActiveShot: ShotItem = { ...activeShot, scene: targetScene === UNASSIGNED_SCENE ? "" : targetScene };

  if (sourceGroupIndex === targetGroupIndex) {
    // Reordering within the same group.
    const insertIndex = overId == null ? withoutActive.length : withoutActive.findIndex((s) => s.id === overId);
    const shots = [...withoutActive];
    shots.splice(insertIndex === -1 ? shots.length : insertIndex, 0, updatedActiveShot);
    next[sourceGroupIndex] = { ...sourceGroup, shots };
    return next;
  }

  const targetGroup = next[targetGroupIndex];
  const targetShots = targetGroup.shots;
  const insertIndex = overId == null ? targetShots.length : targetShots.findIndex((s) => s.id === overId);
  const shots = [...targetShots];
  shots.splice(insertIndex === -1 ? shots.length : insertIndex, 0, updatedActiveShot);
  next[targetGroupIndex] = { ...targetGroup, shots };

  return next;
}
