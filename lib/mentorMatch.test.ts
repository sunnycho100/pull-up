import { describe, it, expect } from "vitest";
import {
  type Person,
  classify,
  isMentor,
  jaccard,
  pairType,
  scorePair,
  assignMentees,
  suggestGroups,
  WEIGHTS,
} from "./mentorMatch";

const P = (id: string, role: Person["role"], over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  school: "UW",
  role,
  field: "CS",
  researchArea: "CV",
  interests: [],
  ...over,
});

describe("classify", () => {
  it("phd + industry are mentors; undergrad + masters are mentees", () => {
    expect(classify(P("a", "phd"))).toBe("mentor");
    expect(classify(P("b", "industry"))).toBe("mentor");
    expect(classify(P("c", "masters"))).toBe("mentee");
    expect(classify(P("d", "undergrad"))).toBe("mentee");
    expect(isMentor(P("a", "phd"))).toBe(true);
  });
});

describe("jaccard", () => {
  it("is intersection over union, case-insensitive", () => {
    expect(jaccard(["Startups", "climbing"], ["startups", "hiking"])).toBeCloseTo(1 / 3);
    expect(jaccard(["a"], ["a"])).toBe(1);
    expect(jaccard([], [])).toBe(0); // both empty → 0, not NaN
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
});

describe("pairType", () => {
  it("mentorship = one mentor + one mentee; otherwise peer", () => {
    expect(pairType(P("a", "phd"), P("b", "undergrad"))).toBe("mentorship");
    expect(pairType(P("a", "phd"), P("b", "industry"))).toBe("peer");
    expect(pairType(P("a", "masters"), P("b", "undergrad"))).toBe("peer");
  });
});

describe("scorePair", () => {
  it("same field, same research, shared interests, cross-role, cross-school → near 1", () => {
    const a = P("a", "phd", { school: "UW", interests: ["cv", "climbing"] });
    const b = P("b", "undergrad", { school: "MIT", interests: ["cv", "climbing"] });
    const s = scorePair(a, b);
    expect(s.field).toBe(1);
    expect(s.research).toBe(1);
    expect(s.interest).toBe(1);
    expect(s.pairType).toBe("mentorship");
    expect(s.roleFactor).toBe(WEIGHTS.mentorshipRoleFactor);
    expect(s.total).toBeCloseTo(1); // topic 1 * 1.0 + 0.05 crossSchool, capped at 1
  });

  it("same field, different research area → research is the 0.5 partial", () => {
    const a = P("a", "phd", { researchArea: "CV" });
    const b = P("b", "undergrad", { researchArea: "NLP", school: "UW" });
    expect(scorePair(a, b).research).toBe(0.5);
  });

  it("different field → field 0 and research 0", () => {
    const a = P("a", "phd", { field: "CS", researchArea: "CV" });
    const b = P("b", "undergrad", { field: "Biology", researchArea: "Genomics", school: "UW" });
    const s = scorePair(a, b);
    expect(s.field).toBe(0);
    expect(s.research).toBe(0);
    expect(s.total).toBe(0); // no topic, same school → no bonus
  });

  it("peer pairs are discounted by the peer role factor", () => {
    const a = P("a", "phd", { school: "UW", interests: ["cv"] });
    const b = P("b", "industry", { school: "UW", interests: ["cv"] }); // both mentors → peer
    const s = scorePair(a, b);
    expect(s.pairType).toBe("peer");
    expect(s.roleFactor).toBe(WEIGHTS.peerRoleFactor);
    // topic = 1 (same field+research+interest), same school → 1 * 0.7 = 0.7
    expect(s.total).toBeCloseTo(0.7);
  });
});

describe("assignMentees", () => {
  it("assigns every mentee once and never exceeds mentor capacity", () => {
    const people = [
      P("m1", "phd"),
      P("m2", "phd"),
      P("s1", "undergrad"),
      P("s2", "undergrad"),
      P("s3", "masters"),
    ];
    const out = assignMentees(people, { mentorCapacity: 2 });
    expect(out.length).toBe(3); // 3 mentees, capacity 2*2=4 seats → all placed
    const menteeIds = out.map((a) => a.menteeId);
    expect(new Set(menteeIds).size).toBe(3); // each mentee once
    const load = new Map<string, number>();
    for (const a of out) load.set(a.mentorId, (load.get(a.mentorId) ?? 0) + 1);
    for (const n of load.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it("leaves a mentee unassigned when mentor seats run out", () => {
    const people = [P("m1", "phd"), P("s1", "undergrad"), P("s2", "undergrad")];
    const out = assignMentees(people, { mentorCapacity: 1 });
    expect(out.length).toBe(1); // only one seat
  });
});

describe("suggestGroups", () => {
  it("fuses two pairs into a foursome and keeps an odd pair as a duo", () => {
    const people = [
      P("m1", "phd"),
      P("s1", "undergrad"),
      P("m2", "phd"),
      P("s2", "undergrad"),
      P("m3", "phd", { field: "Biology", researchArea: "Genomics" }),
      P("s3", "undergrad", { field: "Biology", researchArea: "Genomics" }),
    ];
    const assignments = assignMentees(people, { mentorCapacity: 1 });
    const groups = suggestGroups(assignments, people);
    const sizes = groups.map((g) => g.memberIds.length).sort();
    expect(sizes).toEqual([2, 4]); // one foursome + one leftover duo
    // no person appears twice across groups
    const all = groups.flatMap((g) => g.memberIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it("never fuses two pairs that share a mentor (foursome has 4 distinct people)", () => {
    // One popular mentor (capacity 2) draws two mentees → two pairs share that mentor.
    const people = [
      P("m1", "phd"),
      P("s1", "undergrad", { school: "A" }),
      P("s2", "undergrad", { school: "B" }),
      P("m2", "phd", { field: "Biology", researchArea: "Genomics" }),
      P("s3", "undergrad", { field: "Biology", researchArea: "Genomics" }),
    ];
    const assignments = assignMentees(people, { mentorCapacity: 2 });
    const groups = suggestGroups(assignments, people);
    for (const g of groups) expect(new Set(g.memberIds).size).toBe(g.memberIds.length);
  });
});
