import { NextResponse } from "next/server";
import { getOllamaConfig, generateWithOllama } from "@/lib/ollama";

interface ReportPatternInput {
  category: string;
  oldNormal: string;
  recentNormal: string;
  overspend: string;
}

interface ReportInsightInput {
  category: string;
  tag: string;
  answer: string;
  followUpAnswer?: string;
  summary: string;
}

interface ReportInterceptInput {
  category: string;
  merchant: string;
  decision: string;
}

export async function POST(request: Request) {
  const body = await request.json() as {
    executiveSummary?: string;
    monthlyOverspendLabel?: string;
    topPatterns?: ReportPatternInput[];
    behaviorInsights?: ReportInsightInput[];
    interceptDecisions?: ReportInterceptInput[];
  };
  const config = getOllamaConfig();
  const patternFacts = (body.topPatterns ?? [])
    .map((pattern) => `${pattern.category}: old ${pattern.oldNormal}, recent ${pattern.recentNormal}, overspend ${pattern.overspend}`)
    .join("; ");
  const behaviorFacts = (body.behaviorInsights ?? [])
    .map((insight) => {
      const followUp = insight.followUpAnswer ? `; follow-up "${insight.followUpAnswer}"` : "";

      return `${insight.category}: ${insight.tag}, user said "${insight.answer}"${followUp}`;
    })
    .join("; ");
  const interceptFacts = (body.interceptDecisions ?? [])
    .map((decision) => `${decision.category}: ${decision.merchant} marked ${decision.decision}`)
    .join("; ");
  const prompt = [
    "Write a specific private financial drift review in valid markdown for the paid report.",
    "Speak directly to the person as \"you\". Never say \"the user\" or \"user's\".",
    "Do not repeat these instructions. Do not write placeholder text like \"one bullet\" or \"one concrete step\".",
    "Output exactly these three headings and real content under them:",
    "### What changed",
    "- Cover every pattern in Pattern facts. Put the largest pattern first, then add the remaining patterns below it.",
    "- For each pattern, compare old normal to recent normal with a bracketed scan citation.",
    "- For each pattern, name the monthly overspend and what that means over a month.",
    "### Why it may have happened",
    "- For each pattern, connect the behavior tag and note to the pattern.",
    "- For each pattern, explain whether intercept decisions show intentional spending, automatic spending, or mixed signals.",
    "### What to do next",
    "- For each pattern, give one friction-removal step for the next 7 days.",
    "- For each pattern, give one replacement or default for the next 30 days.",
    "- For each pattern, give one keep-or-cut rule for deciding whether this pattern should stay.",
    "Use only the facts below. Do not invent user data, sensors, income systems, loans, investments, partners, or outside accounts.",
    "Do not say analyze, monitor, seek feedback, adjust habits, set a budget, coupons, or financial advisor.",
    "Do not recommend delivery or takeout as a fix for Dining overspend unless the user context explicitly asks for it.",
    "Make the advice behavior-aware: reward spending needs a planned reward; stress convenience needs a default fallback; social pressure needs a pre-commitment; habit creep needs a rule that interrupts autopilot; intentional upgrade needs a tradeoff check.",
    "Cite scan facts in brackets, such as [Dining old $13 recent $40].",
    `Executive summary: ${body.executiveSummary ?? "No summary"}`,
    `Monthly overspend: ${body.monthlyOverspendLabel ?? "$0"}`,
    `Pattern facts: ${patternFacts || "None"}`,
    `Behavior facts: ${behaviorFacts || "None"}`,
    `Intercept facts: ${interceptFacts || "None"}`
  ].join("\n");

  try {
    const summary = await generateWithOllama({
      system: "You are a careful financial behavior analyst for a private local audit tool.",
      prompt
    }, config);

    return NextResponse.json({
      ok: true,
      model: config.model,
      summary
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Local report AI is unavailable."
    }, { status: 503 });
  }
}
