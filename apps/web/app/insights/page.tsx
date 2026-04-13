"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { describeInsightModel } from "@/lib/ai-behavior-insights";
import {
  BEHAVIOR_TAG_OPTIONS,
  buildBehaviorInsight,
  type BehaviorInsight,
  type BehaviorTag
} from "@/lib/behavior-insights";

export default function InsightsPage() {
  const { behaviorInsights, classifyBehaviorInsight, saveBehaviorInsight, scan } = useAuditWorkspace();
  const topPattern = useMemo(
    () => scan.topCategories.find((category) => category.monthlyOverspendCents > 0),
    [scan.topCategories]
  );
  const category = topPattern?.category ?? "";
  const savedInsight = category ? behaviorInsights[category] : undefined;
  const [answer, setAnswer] = useState(savedInsight?.answer ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [draftInsight, setDraftInsight] = useState<BehaviorInsight | null>(null);
  const [selectedTag, setSelectedTag] = useState<BehaviorTag>(savedInsight?.tag ?? "unknown");

  async function classifyAnswer() {
    if (!category || !answer.trim()) {
      return;
    }

    setIsClassifying(true);
    setStatusMessage("Loading local AI classifier...");
    setDraftInsight(null);

    try {
      const insight = await classifyBehaviorInsight(category, answer);
      setDraftInsight(insight);
      setSelectedTag(insight.tag);
      setStatusMessage(describeInsightModel(insight));
    } catch {
      setStatusMessage("Could not create an insight from this answer. Try a little more detail.");
    } finally {
      setIsClassifying(false);
    }
  }

  function saveEditedInsight() {
    if (!draftInsight || selectedTag === "unknown") {
      return;
    }

    const insight = buildBehaviorInsight(category, answer, draftInsight.createdAt, {
      tag: selectedTag,
      confidence: draftInsight.confidence,
      modelProvider: draftInsight.modelProvider,
      modelName: draftInsight.modelName
    });

    saveBehaviorInsight(insight);
    setDraftInsight(insight);
    setStatusMessage("Insight saved locally.");
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Hugging Face insight
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Pattern Lab</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Turn the largest drift pattern into a private behavior note. Drift runs a public zero-shot model locally in the browser, then saves the tag for recovery paths and intercept checks.
        </p>

        {topPattern ? (
          <div className="mt-6 space-y-4">
            <div className="surface-card">
              <p className="text-xs font-medium uppercase text-muted-foreground">Question</p>
              <h2 className="mt-2 text-xl font-semibold">
                {category} became part of the new normal. What changed around then?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Old normal {topPattern.baselineLabel}. Recent normal {topPattern.recentLabel}. Monthly overspend {topPattern.monthlyOverspendLabel}.
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Your private answer</span>
              <textarea
                className="min-h-32 w-full rounded-[8px] border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring"
                placeholder="Example: I got promoted and started treating myself to nicer dinners after stressful weeks."
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setDraftInsight(null);
                  setStatusMessage(null);
                }}
              />
            </label>
            <Button className="h-10 rounded-[8px]" disabled={!answer.trim() || isClassifying} onClick={classifyAnswer}>
              {isClassifying ? "Classifying locally..." : "Suggest behavior tag"}
            </Button>
            {statusMessage ? (
              <p className="rounded-[8px] border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
                {statusMessage}
              </p>
            ) : null}
            {draftInsight ? (
              <div className="rounded-[8px] border border-border bg-background p-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Behavior tag</span>
                  <select
                    className="field-control"
                    value={selectedTag}
                    onChange={(event) => setSelectedTag(event.target.value as BehaviorTag)}
                  >
                    {BEHAVIOR_TAG_OPTIONS.map((option) => (
                      <option key={option.tag} value={option.tag}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className="mt-4 h-10 rounded-[8px]" onClick={saveEditedInsight}>
                  Save insight
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 surface-card text-sm leading-6 text-muted-foreground">
            No drift pattern needs a behavior note right now. Import or sync evidence with overspending to activate Pattern Lab.
          </div>
        )}
      </div>

      <div className="surface-panel">
        <h2 className="text-xl font-semibold">Saved insight</h2>
        {savedInsight ? (
          <div className="mt-5 space-y-4">
            <Badge className="rounded-[8px] border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              {savedInsight.tagLabel}
            </Badge>
            <p className="text-sm leading-6 text-muted-foreground">{savedInsight.summary}</p>
            <p className="rounded-[8px] border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
              {describeInsightModel(savedInsight)}
            </p>
            <div className="surface-card">
              <p className="text-xs font-medium uppercase text-muted-foreground">Stored answer</p>
              <p className="mt-2 text-sm leading-6">{savedInsight.answer}</p>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Answer the question to save the first local behavior tag.
          </p>
        )}
      </div>
    </section>
  );
}
