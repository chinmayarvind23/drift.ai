import { NextResponse } from "next/server";
import { getOllamaConfig, generateWithOllama } from "@/lib/ollama";

export async function POST(request: Request) {
  const body = await request.json() as {
    category?: string;
    overspendLabel?: string;
    behaviorTagLabel?: string;
    userAnswer?: string;
    followUpAnswer?: string;
  };
  const config = getOllamaConfig();

  try {
    const text = await generateWithOllama({
      system: "You write private, non-judgmental recovery paths for a financial behavior audit.",
      prompt: [
        "Write only 3 markdown bullets. Do not add headings, labels, tables, separators, or introductions.",
        "Each bullet must be one specific action the user can try.",
        "Bullet 1: a next-7-days action.",
        "Bullet 2: a 30-day replacement/default.",
        "Bullet 3: a keep-or-cut rule for deciding whether the pattern stays.",
        "Avoid shame. Do not mention budgets, coupons, partners, financial advisors, tracking journals, investment advice, delivery, or takeout unless the user specifically asked for it.",
        "Do not write more than 85 words total.",
        "Make it behavior-aware: reward spending gets a planned reward; stress convenience gets a fallback default; social pressure gets a pre-commitment; habit creep gets an autopilot interruption; intentional upgrade gets a tradeoff check.",
        "Use only the category, overspend, behavior tag, and user context below.",
        `Category: ${body.category ?? "Unknown"}`,
        `Monthly overspend: ${body.overspendLabel ?? "$0"}`,
        `Behavior tag: ${body.behaviorTagLabel ?? "No behavior note yet"}`,
        `User context: ${body.userAnswer || "No user context saved."}`,
        `Follow-up context: ${body.followUpAnswer || "No follow-up context saved."}`
      ].join("\n")
    }, config);

    return NextResponse.json({ ok: true, text, model: config.model });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Local recovery AI is unavailable."
    }, { status: 503 });
  }
}
