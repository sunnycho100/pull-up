import { describe, it, expect } from "vitest";
import { validateAssignment, roundRobinGroups } from "./matching";

const ids = (n: number) => Array.from({length: n}, (_, i) => `u${i}`);

describe("validateAssignment", () => {
  it("passes a clean partition", () => {
    const r = validateAssignment(ids(10),
      [{memberIds: ids(10).slice(0,5)}, {memberIds: ids(10).slice(5)}]);
    expect(r.ok).toBe(true);
  });
  it("catches missing and duplicated users", () => {
    const r = validateAssignment(ids(10),
      [{memberIds: ["u0","u1","u2","u3","u0"]}, {memberIds: ["u5","u6","u7","u8"]}]);
    expect(r.ok).toBe(false);
    expect(r.dupes).toContain("u0");
    expect(r.missing).toContain("u4");
    expect(r.missing).toContain("u9");
  });
  it("flags oversize groups", () => {
    const r = validateAssignment(ids(7), [{memberIds: ids(7)}]);
    expect(r.ok).toBe(false);
    expect(r.oversize).toEqual([0]);
  });
  it("flags unknown ids not in the signup list", () => {
    const r = validateAssignment(ids(5), [{memberIds: [...ids(5), "ghost"]}]);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("ghost");
  });
});

describe("roundRobinGroups", () => {
  const profiles = ids(13).map(id => ({ userId: id, name: id, school: "",
    position: "", interests: [] }));
  it("partitions everyone exactly once within size bounds", () => {
    const gs = roundRobinGroups(profiles);
    const all = gs.flatMap(g => g.memberIds).sort();
    expect(all).toEqual(ids(13).sort());
    for (const g of gs) {
      expect(g.memberIds.length).toBeGreaterThanOrEqual(4);
      expect(g.memberIds.length).toBeLessThanOrEqual(6);
    }
  });
  it("handles n<min as one flex group", () => {
    const gs = roundRobinGroups(profiles.slice(0, 3));
    expect(gs.length).toBe(1);
    expect(gs[0].memberIds.length).toBe(3);
  });
  it("handles n=0 without crashing", () => {
    const gs = roundRobinGroups([]);
    expect(gs.length).toBe(1);
    expect(gs[0].memberIds).toEqual([]);
  });
});
