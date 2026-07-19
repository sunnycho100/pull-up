import { describe, it, expect } from "vitest";
import { validateAssignment, roundRobinGroups, type SignupProfile } from "./matching";

const ids = (n: number) => Array.from({length: n}, (_, i) => `u${i}`);

// Build signup profiles from a list of party sizes: sizes[i] is user u{i}'s headcount.
const parties = (sizes: number[]): SignupProfile[] =>
  sizes.map((size, i) => ({ userId: `u${i}`, name: `u${i}`, school: "",
    position: "", interests: [], partySize: size }));

const sizeMap = (sizes: number[]) =>
  new Map(sizes.map((s, i) => [`u${i}`, s]));

const headcount = (memberIds: string[], sizes: Map<string, number>) =>
  memberIds.reduce((n, id) => n + (sizes.get(id) ?? 1), 0);

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

describe("roundRobinGroups — party headcount", () => {
  it("seats a pair and a trio at one table of 5", () => {
    const sizes = [3, 2];
    const gs = roundRobinGroups(parties(sizes));
    expect(gs.length).toBe(1);
    expect(gs[0].memberIds.sort()).toEqual(["u0", "u1"]);
    expect(headcount(gs[0].memberIds, sizeMap(sizes))).toBe(5);
  });

  it("packs two trios without exceeding max headcount", () => {
    const sizes = [3, 3];
    const gs = roundRobinGroups(parties(sizes));
    const sm = sizeMap(sizes);
    for (const g of gs) expect(headcount(g.memberIds, sm)).toBeLessThanOrEqual(6);
    // both trios placed, everyone once
    expect(gs.flatMap((g) => g.memberIds).sort()).toEqual(["u0", "u1"]);
  });

  it("keeps two parties of 4 at separate tables (8 > max)", () => {
    const sizes = [4, 4];
    const gs = roundRobinGroups(parties(sizes));
    const sm = sizeMap(sizes);
    expect(gs.length).toBe(2);
    for (const g of gs) expect(headcount(g.memberIds, sm)).toBe(4);
  });

  it("gives a full party of 6 its own table", () => {
    const sizes = [6];
    const gs = roundRobinGroups(parties(sizes));
    expect(gs.length).toBe(1);
    expect(headcount(gs[0].memberIds, sizeMap(sizes))).toBe(6);
  });

  it("balances 7 solo diners into 4+3, not a lone diner (6+1)", () => {
    const sizes = Array(7).fill(1);
    const gs = roundRobinGroups(parties(sizes));
    const sm = sizeMap(sizes);
    expect(gs.length).toBe(2);
    for (const g of gs) {
      const h = headcount(g.memberIds, sm);
      expect(h).toBeLessThanOrEqual(6);
      expect(h).toBeGreaterThanOrEqual(3); // no lone diner
    }
  });

  it("never exceeds max headcount and seats everyone exactly once (mixed)", () => {
    const sizes = [1, 2, 3, 4, 1, 2, 3, 1, 2, 5, 1];
    const gs = roundRobinGroups(parties(sizes));
    const sm = sizeMap(sizes);
    const all = gs.flatMap((g) => g.memberIds).sort();
    expect(all).toEqual(ids(sizes.length).sort());
    for (const g of gs) expect(headcount(g.memberIds, sm)).toBeLessThanOrEqual(6);
    // no atom split: every id appears exactly once (already covered by all==ids, no dupes)
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("validateAssignment — by headcount", () => {
  it("accepts a table whose member-count is 2 but headcount is 5", () => {
    const sizes = new Map([["a", 3], ["b", 2]]);
    const r = validateAssignment(["a", "b"], [{ memberIds: ["a", "b"] }], 4, 6, sizes);
    expect(r.ok).toBe(true);
  });
  it("flags a table oversized by headcount even with few members", () => {
    const sizes = new Map([["a", 3], ["b", 3], ["c", 2]]);
    const r = validateAssignment(["a", "b", "c"], [{ memberIds: ["a", "b", "c"] }], 4, 6, sizes);
    expect(r.ok).toBe(false);
    expect(r.oversize).toEqual([0]);
  });
});
