import Link from "next/link";

export default function MethodologyPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-6 md:px-8 lg:py-8">
      <article className="surface-panel">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/">
          Back to scan
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Drift Score Methodology</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Drift compares the earliest half of the available months with the latest half. The score is a signal for repeated lifestyle inflation, not a credit score or a moral judgment.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7">
          <section>
            <h2 className="text-xl font-semibold">1. Build the windows</h2>
            <p className="mt-2 text-muted-foreground">
              If you provide two months of data, Drift compares month one against month two. If you provide eight months, it compares the first four months against the last four months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Average each category</h2>
            <p className="mt-2 text-muted-foreground">
              Old monthly average equals old-window category spend divided by old-window months. Recent monthly average equals recent-window category spend divided by recent-window months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Calculate overspend</h2>
            <pre className="mt-3 overflow-x-auto rounded-[8px] border border-border bg-background p-4 text-xs"><code>{`monthly overspend = max(0, recent monthly average - old monthly average)`}</code></pre>
            <p className="mt-2 text-muted-foreground">
              If recent spending is lower, overspend is zero. That category does not increase the Drift Score.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Calculate category drift</h2>
            <pre className="mt-3 overflow-x-auto rounded-[8px] border border-border bg-background p-4 text-xs"><code>{`category drift % = monthly overspend / old monthly average`}</code></pre>
            <p className="mt-2 text-muted-foreground">
              A category with old spending and no recent spending is marked “No longer active.” It stays visible as evidence, but it does not create overspend.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Score ranges</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Range label="0" text="No repeated overspend found in the current window." />
              <Range label="1-39" text="Light drift. Worth watching, usually not urgent." />
              <Range label="40-69" text="Moderate drift. A reset plan can recover meaningful room." />
              <Range label="70-100" text="High drift. Recent spending has clearly moved away from the old normal." />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">What changes when you edit a category?</h2>
            <p className="mt-2 text-muted-foreground">
              Category edits move that transaction into the new category everywhere. The scan, category detail, recovery plan, what-if estimate, Pattern Lab target, Intercept category list, and report all use the edited transaction set.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}

function Range({ label, text }: { label: string; text: string }) {
  return (
    <div className="surface-card">
      <p className="text-lg font-semibold">{label}</p>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </div>
  );
}
