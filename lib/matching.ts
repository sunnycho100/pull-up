// lib/matching.ts
import Anthropic from "@anthropic-ai/sdk";

export type SignupProfile = { userId: string; name: string; school: string;
  position: string; interests: string[]; groupSizePref?: number; notes?: string };
export type MatchGroup = { memberIds: string[]; name: string; rationale: string;
  suggestedPlace: string };

export function validateAssignment(signupIds: string[],
  groups: { memberIds: string[] }[], min = 4, max = 6) {
  const seen = new Map<string, number>();
  for (const g of groups) for (const id of g.memberIds)
    seen.set(id, (seen.get(id) ?? 0) + 1);
  const dupes = [...seen].filter(([, c]) => c > 1).map(([id]) => id);
  const missing = signupIds.filter(id => !seen.has(id));
  const extra = [...seen.keys()].filter(id => !signupIds.includes(id));
  const oversize = groups.flatMap((g, i) =>
    g.memberIds.length > max || (groups.length > 1 && g.memberIds.length < min) ? [i] : []);
  return { ok: !dupes.length && !missing.length && !extra.length && !oversize.length,
    missing: [...missing, ...extra], dupes, oversize };
}

export function roundRobinGroups(signups: SignupProfile[], target = 5): MatchGroup[] {
  const n = signups.length;
  const count = Math.max(1, Math.round(n / target));
  const groups: string[][] = Array.from({ length: count }, () => []);
  signups.forEach((s, i) => groups[i % count].push(s.userId));
  return groups.map((memberIds, i) => ({ memberIds,
    name: `Table ${i + 1}`, rationale: "Grouped to keep tables even.",
    suggestedPlace: "" }));
}

const TOOL = {
  name: "submit_groups",
  description: "Submit the final grouping",
  input_schema: {
    type: "object" as const,
    properties: { groups: { type: "array", items: { type: "object", properties: {
      memberIds: { type: "array", items: { type: "string" } },
      name: { type: "string" }, rationale: { type: "string" },
      suggestedPlace: { type: "string" } },
      required: ["memberIds", "name", "rationale", "suggestedPlace"] } } },
    required: ["groups"] },
};

export async function matchSlot(signups: SignupProfile[],
  opts: { min?: number; max?: number; model?: string } = {}): Promise<MatchGroup[]> {
  const { min = 4, max = 6, model = "claude-sonnet-5" } = opts;
  if (signups.length <= max) return roundRobinGroups(signups);
  const client = new Anthropic();
  const ids = signups.map(s => s.userId);
  const prompt = `Group these UKC 2026 conference attendees into dinner tables of ${min}-${max} people by shared research interests and vibe. Every attendee appears in EXACTLY one group. Give each group a short fun name, a one-sentence "why you matched" rationale (warm, specific, mention shared interests), and a suggested cuisine near ChampionsGate FL (Korean options welcome).\n\nAttendees:\n${JSON.stringify(signups, null, 1)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({ model, max_tokens: 4096,
      tools: [TOOL], tool_choice: { type: "tool", name: "submit_groups" },
      messages: [{ role: "user", content: prompt }] });
    const call = res.content.find(b => b.type === "tool_use");
    if (call && call.type === "tool_use") {
      const groups = (call.input as { groups: MatchGroup[] }).groups;
      if (validateAssignment(ids, groups, min, max).ok) return groups;
    }
  }
  return roundRobinGroups(signups); // ponytail: LLM twice then deterministic fallback
}
