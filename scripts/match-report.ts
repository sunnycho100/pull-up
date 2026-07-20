// Test-run the mentor–mentee matcher on the synthetic dataset and dump CSVs to inspect.
//   node --experimental-strip-types scripts/match-report.ts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  type Person,
  classify,
  scorePair,
  assignMentees,
  suggestGroups,
} from "../lib/mentorMatch.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const people: Person[] = JSON.parse(readFileSync(join(root, "data/synthetic-people.json"), "utf8"));
const byId = new Map(people.map((p) => [p.id, p]));
const pct = (n: number) => (n * 100).toFixed(1);
const csv = (rows: (string | number)[][]) => rows.map((r) => r.join(",")).join("\n") + "\n";

// --- ratio sanity check ---
const mentors = people.filter((p) => classify(p) === "mentor");
const mentees = people.filter((p) => classify(p) === "mentee");
console.log(`People: ${people.length} — mentors ${mentors.length}, mentees ${mentees.length}`);

// --- 1. full pairwise matrix (every unordered pair) ---
const assignments = assignMentees(people);
const assignedSet = new Set(assignments.map((a) => `${a.menteeId}|${a.mentorId}`));
const key = (a: Person, b: Person) =>
  classify(a) === "mentee" ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;

const matrix: (string | number)[][] = [
  ["a_id","a_name","a_role","a_field","a_area","b_id","b_name","b_role","b_field","b_area",
   "pairType","field","research","interest","roleFactor","crossSchool","total_%","assigned"],
];
for (let i = 0; i < people.length; i++)
  for (let j = i + 1; j < people.length; j++) {
    const a = people[i], b = people[j];
    const s = scorePair(a, b);
    const assigned = s.pairType === "mentorship" && assignedSet.has(key(a, b)) ? "Y" : "";
    matrix.push([
      a.id, a.name, a.role, a.field, a.researchArea,
      b.id, b.name, b.role, b.field, b.researchArea,
      s.pairType, s.field, s.research, s.interest.toFixed(2), s.roleFactor, s.crossSchool,
      pct(s.total), assigned,
    ]);
  }
writeFileSync(join(root, "data/match-report.csv"), csv(matrix));

// --- 2. chosen 1:1 assignments ---
const pairRows: (string | number)[][] = [["mentee_id","mentee","mentor_id","mentor","field_match","score_%"]];
for (const a of [...assignments].sort((x, y) => y.score - x.score)) {
  const mentee = byId.get(a.menteeId)!, mentor = byId.get(a.mentorId)!;
  pairRows.push([
    mentee.id, mentee.name, mentor.id, mentor.name,
    mentee.field === mentor.field ? "same" : "cross", pct(a.score),
  ]);
}
writeFileSync(join(root, "data/match-pairs.csv"), csv(pairRows));

// --- 3. suggested groups (two pairs fused) ---
const groups = suggestGroups(assignments, people);
const groupRows: (string | number)[][] = [["group","size","affinity_%","members","fields"]];
groups.forEach((g, i) => {
  const members = g.memberIds.map((id) => byId.get(id)!);
  groupRows.push([
    `G${i + 1}`, g.memberIds.length, pct(g.affinity),
    members.map((p) => `${p.name} (${p.role})`).join(" · "),
    [...new Set(members.map((p) => p.field))].join(" / "),
  ]);
});
writeFileSync(join(root, "data/match-groups.csv"), csv(groupRows));

console.log(`Assigned ${assignments.length}/${mentees.length} mentees; ${groups.length} groups.`);
console.log("Wrote data/match-report.csv, data/match-pairs.csv, data/match-groups.csv");
