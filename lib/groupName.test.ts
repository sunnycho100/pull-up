import { describe, it, expect } from "vitest";
import { nameGroup, nameGroups, type NameableMember } from "./groupName";
import bank from "../data/group-names.json";

const M = (over: Partial<NameableMember>): NameableMember => ({ interests: [], ...over });

describe("nameGroup", () => {
  it("picks a vibe name when a shared interest holds the majority", () => {
    const members = [
      M({ interests: ["climbing", "coffee"] }),
      M({ interests: ["climbing"] }),
      M({ interests: ["gaming"] }),
    ];
    expect(bank.vibe.climbing).toContain(nameGroup(members));
  });

  it("picks a field-category name when a field dominates", () => {
    const members = [
      M({ position: "PhD Student", interests: ["machine learning"] }),
      M({ position: "Software Engineer", interests: ["ai"] }),
      M({ interests: ["data"] }),
    ];
    expect(bank.cs_data).toContain(nameGroup(members));
  });

  it("falls back to a mixed name with no clear identity", () => {
    const members = [M({ interests: ["knitting"] }), M({ interests: ["birdwatching"] })];
    expect(bank.mixed).toContain(nameGroup(members));
  });

  it("never repeats a name within a batch", () => {
    const groups = [
      { memberIds: ["a", "b"] },
      { memberIds: ["c", "d"] },
      { memberIds: ["e", "f"] },
    ];
    const profiles = new Map<string, NameableMember>([
      ["a", M({ interests: ["ai"] })], ["b", M({ interests: ["ml"] })],
      ["c", M({ interests: ["ai"] })], ["d", M({ interests: ["software"] })],
      ["e", M({ interests: ["ai"] })], ["f", M({ interests: ["data"] })],
    ]);
    const names = nameGroups(groups, profiles);
    expect(new Set(names).size).toBe(3); // all three cs_data groups get distinct names
  });
});
