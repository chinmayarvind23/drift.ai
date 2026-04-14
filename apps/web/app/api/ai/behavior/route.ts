import { NextResponse } from "next/server";
import { classifyBehaviorAnswer, getBehaviorTagLabel, type BehaviorTag } from "@/lib/behavior-insights";
import { generateWithOllama } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TAGS: BehaviorTag[] = [
  "reward_spending",
  "stress_convenience",
  "social_pressure",
  "habit_creep",
  "life_event",
  "intentional_upgrade",
  "unknown"
];

export async function POST(request: Request) {
  const body = (await request.json()) as { category?: string; answer?: string };
  const category = body.category?.trim() || "Spending";
  const answer = body.answer?.trim() ?? "";

  if (!answer) {
    return NextResponse.json({
      ok: true,
      provider: "deterministic",
      tag: "unknown",
      tagLabel: getBehaviorTagLabel("unknown")
    });
  }

  try {
    const response = await generateWithOllama({
      system: "Classify private spending context. Return only one tag.",
      prompt: [
        "Pick exactly one tag from this list:",
        VALID_TAGS.join(", "),
        `Category: ${category}`,
        `User answer: ${answer}`,
        "Return only the tag id, no explanation."
      ].join("\n")
    });
    const tag = normalizeTag(response);

    return NextResponse.json({
      ok: true,
      provider: "ollama",
      tag,
      tagLabel: getBehaviorTagLabel(tag),
      followUpQuestion: buildFollowUpQuestion(category, answer, tag)
    });
  } catch {
    const tag = classifyBehaviorAnswer(answer);

    return NextResponse.json({
      ok: true,
      provider: "deterministic",
      tag,
      tagLabel: getBehaviorTagLabel(tag),
      followUpQuestion: buildFollowUpQuestion(category, answer, tag)
    });
  }
}

function normalizeTag(value: string): BehaviorTag {
  const normalized = value.trim().toLowerCase().replace(/[^a-z_]/g, "");
  return VALID_TAGS.includes(normalized as BehaviorTag)
    ? (normalized as BehaviorTag)
    : "unknown";
}

function buildFollowUpQuestion(category: string, answer: string, tag: BehaviorTag): string {
  const normalizedAnswer = answer.trim().toLowerCase();

  if (tag === "reward_spending") {
    return `For ${category}, what would count as one intentional reward versus an automatic repeat?`;
  }

  if (tag === "stress_convenience") {
    return `For ${category}, what was the stressful moment or convenience trigger that made this the default?`;
  }

  if (tag === "social_pressure") {
    return `For ${category}, whose plans or expectations made this harder to say no to?`;
  }

  if (tag === "habit_creep") {
    return `For ${category}, when did this start feeling automatic instead of chosen?`;
  }

  if (tag === "intentional_upgrade") {
    return `For ${category}, what part of this upgrade is worth keeping on purpose?`;
  }

  if (tag === "life_event") {
    return `For ${category}, which part of the life change is temporary and which part is permanent?`;
  }

  if (normalizedAnswer.split(/\s+/).length < 8) {
    return `What specifically changed around ${category}: stress, reward, social plans, habit, or a life event?`;
  }

  return `What would make this ${category} pattern feel intentional next month?`;
}
