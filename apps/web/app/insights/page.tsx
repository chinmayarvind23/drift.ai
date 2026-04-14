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
import type { DriftScanCategory } from "@/lib/drift-scan";

interface PatternQuestionState {
  answer: string;
  draftInsight: BehaviorInsight | null;
  followUpAnswer: string;
  isClassifying: boolean;
  selectedTag: BehaviorTag;
  statusMessage: string | null;
}

export default function InsightsPage() {
  const { behaviorInsights, classifyBehaviorInsight, saveBehaviorInsight, scan } = useAuditWorkspace();
  const flaggedPatterns = useMemo(
    () => scan.topCategories.filter((category) => category.monthlyOverspendCents > 0),
    [scan.topCategories]
  );
  const savedInsights = Object.values(behaviorInsights);
  const [questionState, setQuestionState] = useState<Record<string, PatternQuestionState>>({});

  function getQuestionState(category: string): PatternQuestionState {
    return questionState[category] ?? getDefaultQuestionState(category);
  }

  function updateQuestionState(category: string, patch: Partial<PatternQuestionState>) {
    setQuestionState((current) => ({
      ...current,
      [category]: {
        ...(current[category] ?? getDefaultQuestionState(category)),
        ...patch
      }
    }));
  }

  function getDefaultQuestionState(category: string): PatternQuestionState {
    const savedInsight = behaviorInsights[category];

    return {
      answer: savedInsight?.answer ?? "",
      draftInsight: null,
      followUpAnswer: savedInsight?.followUpAnswer ?? "",
      isClassifying: false,
      selectedTag: savedInsight?.tag ?? "unknown",
      statusMessage: null
    };
  }

  async function classifyAnswer(category: string) {
    const state = getQuestionState(category);

    if (!state.answer.trim()) {
      return;
    }

    updateQuestionState(category, {
      isClassifying: true,
      statusMessage: "Asking local behavior AI...",
      draftInsight: null
    });

    try {
      const insight = await classifyBehaviorInsight(category, state.answer);

      updateQuestionState(category, {
        draftInsight: insight,
        selectedTag: insight.tag,
        statusMessage: describeInsightModel(insight)
      });
    } catch {
      updateQuestionState(category, {
        statusMessage: "Could not create an insight from this answer. Try a little more detail."
      });
    } finally {
      updateQuestionState(category, { isClassifying: false });
    }
  }

  function saveEditedInsight(category: string) {
    const state = getQuestionState(category);

    if (!state.draftInsight || state.selectedTag === "unknown") {
      return;
    }

    const insight = buildBehaviorInsight(category, state.answer, state.draftInsight.createdAt, {
      tag: state.selectedTag,
      confidence: null,
      modelProvider: state.draftInsight.modelProvider,
      modelName: state.draftInsight.modelName,
      followUpQuestion: state.draftInsight.followUpQuestion,
      followUpAnswer: state.followUpAnswer
    });

    saveBehaviorInsight(insight);
    updateQuestionState(category, {
      draftInsight: insight,
      statusMessage: "Insight saved locally. Sync from Account when you want it backed up."
    });
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[1.1fr_0.9fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Local behavior AI
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Pattern Lab</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Answer each flagged pattern in your own words. Drift suggests a label you can edit, then uses the saved note in the plan, intercept, and report.
        </p>

        {flaggedPatterns.length > 0 ? (
          <div className="mt-6 space-y-5">
            {flaggedPatterns.map((pattern) => (
              <PatternQuestion
                key={pattern.category}
                pattern={pattern}
                state={getQuestionState(pattern.category)}
                onAnswerChange={(answer) => updateQuestionState(pattern.category, {
                  answer,
                  draftInsight: null,
                  followUpAnswer: "",
                  statusMessage: null
                })}
                onClassify={() => classifyAnswer(pattern.category)}
                onFollowUpAnswerChange={(followUpAnswer) => updateQuestionState(pattern.category, { followUpAnswer })}
                onSave={() => saveEditedInsight(pattern.category)}
                onSelectedTagChange={(selectedTag) => updateQuestionState(pattern.category, { selectedTag })}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 surface-card text-sm leading-6 text-muted-foreground">
            No drift pattern needs a note right now. Import or sync transactions with overspending to activate Pattern Lab.
          </div>
        )}
      </div>

      <div className="surface-panel">
        <h2 className="text-xl font-semibold">Saved insights</h2>
        {savedInsights.length > 0 ? (
          <div className="mt-5 space-y-4">
            {savedInsights.map((insight) => (
              <div key={insight.category} className="rounded-[8px] border border-border bg-background p-4">
                <Badge className="rounded-[8px] border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  {insight.tagLabel}
                </Badge>
                <p className="mt-3 text-sm font-semibold">{insight.category}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.summary}</p>
                <p className="mt-2 rounded-[8px] border border-border bg-card p-3 text-xs leading-5 text-muted-foreground">
                  {describeInsightModel(insight)}
                </p>
                <div className="mt-3 surface-card">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Stored answer</p>
                  <p className="mt-2 text-sm leading-6">{insight.answer}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Answer a pattern question to save the first local behavior tag.
          </p>
        )}
      </div>
    </section>
  );
}

function PatternQuestion({
  onAnswerChange,
  onClassify,
  onFollowUpAnswerChange,
  onSave,
  onSelectedTagChange,
  pattern,
  state
}: {
  onAnswerChange: (answer: string) => void;
  onClassify: () => void;
  onFollowUpAnswerChange: (answer: string) => void;
  onSave: () => void;
  onSelectedTagChange: (tag: BehaviorTag) => void;
  pattern: DriftScanCategory;
  state: PatternQuestionState;
}) {
  return (
    <div className="rounded-[8px] border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">Pattern question</p>
      <h2 className="mt-2 text-xl font-semibold">
        {pattern.category} moved into the recent normal. What changed around then?
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Old normal {pattern.baselineLabel}. Recent normal {pattern.recentLabel}. Monthly overspend {pattern.monthlyOverspendLabel}.
      </p>
      <label className="mt-4 block space-y-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Your private answer</span>
        <textarea
          aria-label="Your private answer"
          className="min-h-32 w-full rounded-[8px] border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring"
          placeholder="Example: I got promoted and started treating myself after stressful weeks."
          value={state.answer}
          onChange={(event) => onAnswerChange(event.target.value)}
        />
      </label>
      <Button className="mt-4 h-10 rounded-[8px]" disabled={!state.answer.trim() || state.isClassifying} onClick={onClassify}>
        {state.isClassifying ? "Asking local AI..." : "Suggest pattern label"}
      </Button>
      {state.statusMessage ? (
        <p className="mt-4 rounded-[8px] border border-border bg-card p-3 text-sm leading-6 text-muted-foreground">
          {state.statusMessage}
        </p>
      ) : null}
      {state.draftInsight ? (
        <div className="mt-4 rounded-[8px] border border-border bg-card p-4">
          {state.draftInsight.followUpQuestion ? (
            <label className="mb-4 block space-y-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Follow-up question</span>
              <p className="text-sm leading-6 text-muted-foreground">{state.draftInsight.followUpQuestion}</p>
              <textarea
                aria-label="AI follow-up answer"
                className="min-h-24 w-full rounded-[8px] border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring"
                placeholder="Add the detail that makes this pattern clearer."
                value={state.followUpAnswer}
                onChange={(event) => onFollowUpAnswerChange(event.target.value)}
              />
            </label>
          ) : null}
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Pattern label</span>
            <select
              aria-label="Pattern label"
              className="field-control"
              value={state.selectedTag}
              onChange={(event) => onSelectedTagChange(event.target.value as BehaviorTag)}
            >
              {BEHAVIOR_TAG_OPTIONS.map((option) => (
                <option key={option.tag} value={option.tag}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button className="mt-4 h-10 rounded-[8px]" onClick={onSave}>
            Save insight
          </Button>
        </div>
      ) : null}
    </div>
  );
}
