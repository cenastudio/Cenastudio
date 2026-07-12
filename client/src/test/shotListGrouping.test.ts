import { describe, expect, it } from "vitest";
import {
  groupShotsByScene,
  totalDurationSec,
  formatDuration,
  flattenGroups,
  moveShotBetweenGroups,
  UNASSIGNED_SCENE,
} from "@/lib/shotListGrouping";
import type { ShotItem } from "@/lib/api";

function makeShot(overrides: Partial<ShotItem> & { id: number }): ShotItem {
  return {
    shot_list_id: 1,
    order_index: 0,
    scene: "",
    shot_type: "",
    description: "",
    camera: "",
    lens: "",
    movement: "",
    duration_sec: null,
    status: "pending",
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupShotsByScene", () => {
  it("groups shots by scene preserving relative order", () => {
    const shots = [
      makeShot({ id: 1, scene: "1A", description: "a" }),
      makeShot({ id: 2, scene: "1B", description: "b" }),
      makeShot({ id: 3, scene: "1A", description: "c" }),
    ];
    const groups = groupShotsByScene(shots);
    expect(groups.map((g) => g.scene)).toEqual(["1A", "1B"]);
    expect(groups[0].shots.map((s) => s.id)).toEqual([1, 3]);
    expect(groups[1].shots.map((s) => s.id)).toEqual([2]);
  });

  it("puts shots with empty/whitespace scene into UNASSIGNED_SCENE, placed last", () => {
    const shots = [
      makeShot({ id: 1, scene: "" }),
      makeShot({ id: 2, scene: "1A" }),
      makeShot({ id: 3, scene: "   " }),
    ];
    const groups = groupShotsByScene(shots);
    expect(groups.map((g) => g.scene)).toEqual(["1A", UNASSIGNED_SCENE]);
    expect(groups[1].shots.map((s) => s.id)).toEqual([1, 3]);
  });

  it("computes totalDurationSec per group, treating null as 0", () => {
    const shots = [
      makeShot({ id: 1, scene: "1A", duration_sec: 30 }),
      makeShot({ id: 2, scene: "1A", duration_sec: null }),
      makeShot({ id: 3, scene: "1A", duration_sec: 15 }),
    ];
    const groups = groupShotsByScene(shots);
    expect(groups[0].totalDurationSec).toBe(45);
  });

  it("returns an empty array for an empty shot list", () => {
    expect(groupShotsByScene([])).toEqual([]);
  });
});

describe("totalDurationSec", () => {
  it("sums duration across all shots regardless of scene", () => {
    const shots = [
      makeShot({ id: 1, duration_sec: 60 }),
      makeShot({ id: 2, duration_sec: null }),
      makeShot({ id: 3, duration_sec: 40 }),
    ];
    expect(totalDurationSec(shots)).toBe(100);
  });
});

describe("formatDuration", () => {
  it("formats zero and sub-minute durations", () => {
    expect(formatDuration(0)).toBe("0min");
    expect(formatDuration(30)).toBe("1min");
  });

  it("formats minutes only when under an hour", () => {
    expect(formatDuration(600)).toBe("10min");
  });

  it("formats whole hours without minutes", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
  });

  it("formats hours and minutes together, zero-padded", () => {
    expect(formatDuration(3600 + 5 * 60)).toBe("1h05");
    expect(formatDuration(2 * 3600 + 45 * 60)).toBe("2h45");
  });
});

describe("flattenGroups", () => {
  it("flattens groups back into a single ordered list", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "1B" }),
      makeShot({ id: 3, scene: "1A" }),
    ]);
    expect(flattenGroups(groups).map((s) => s.id)).toEqual([1, 3, 2]);
  });
});

describe("moveShotBetweenGroups", () => {
  it("reorders within the same group when targetScene matches the current scene", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "1A" }),
      makeShot({ id: 3, scene: "1A" }),
    ]);
    const moved = moveShotBetweenGroups(groups, 3, "1A", 1);
    expect(moved[0].shots.map((s) => s.id)).toEqual([3, 1, 2]);
  });

  it("appends within the same group when overId is null", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "1A" }),
    ]);
    const moved = moveShotBetweenGroups(groups, 1, "1A", null);
    expect(moved[0].shots.map((s) => s.id)).toEqual([2, 1]);
  });

  it("moves a shot to a different scene and updates its scene field", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "1B" }),
      makeShot({ id: 3, scene: "1B" }),
    ]);
    const moved = moveShotBetweenGroups(groups, 1, "1B", 3);

    const groupA = moved.find((g) => g.scene === "1A")!;
    const groupB = moved.find((g) => g.scene === "1B")!;
    expect(groupA.shots).toHaveLength(0);
    expect(groupB.shots.map((s) => s.id)).toEqual([2, 1, 3]);
    expect(groupB.shots.find((s) => s.id === 1)!.scene).toBe("1B");
  });

  it("moving into UNASSIGNED_SCENE clears the shot's scene field", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "" }),
    ]);
    const moved = moveShotBetweenGroups(groups, 1, UNASSIGNED_SCENE, null);
    const unassigned = moved.find((g) => g.scene === UNASSIGNED_SCENE)!;
    expect(unassigned.shots.map((s) => s.id)).toEqual([2, 1]);
    expect(unassigned.shots.find((s) => s.id === 1)!.scene).toBe("");
  });

  it("returns the same groups unchanged if activeId is not found", () => {
    const groups = groupShotsByScene([makeShot({ id: 1, scene: "1A" })]);
    const moved = moveShotBetweenGroups(groups, 999, "1A", null);
    expect(moved).toBe(groups);
  });

  it("appends to the target group when overId is not found in it", () => {
    const groups = groupShotsByScene([
      makeShot({ id: 1, scene: "1A" }),
      makeShot({ id: 2, scene: "1B" }),
    ]);
    const moved = moveShotBetweenGroups(groups, 1, "1B", 999);
    const groupB = moved.find((g) => g.scene === "1B")!;
    expect(groupB.shots.map((s) => s.id)).toEqual([2, 1]);
  });
});
