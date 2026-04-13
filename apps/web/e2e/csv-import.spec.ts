import { expect, test } from "@playwright/test";

async function importFixture(page: import("@playwright/test").Page, fixtureName: string) {
  await page.goto("/");
  await page.getByLabel("Import CSV").setInputFiles(`tests/fixtures/${fixtureName}`);
}

test("imports CSV and updates the Drift Scan dashboard", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await expect(page.getByText("Imported 12 transactions from sample-drift.csv.")).toBeVisible();
  await expect(page.getByText("Imported CSV")).toBeVisible();
  await expect(page.getByText("Where did the raise go?")).toBeVisible();
  await expect(page.getByText("$2,123")).toBeVisible();
  await expect(page.getByText("$4,800 redirected from overspend")).toBeVisible();
  await expect(page.getByText("Old normal $20. Recent normal $60.")).toBeVisible();
  await page.getByLabel("How this is calculated").first().hover();
  await page.getByRole("link", { name: "Score guide" }).first().click();
  await expect(page).toHaveURL(/\/methodology/);
  await expect(page.getByRole("heading", { name: "Drift Score Methodology" })).toBeVisible();
});

test("keeps demo-only test profile controls off the Scan page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Test profile")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Load test profile" })).toHaveCount(0);
});

test("starts with zero values until evidence is imported or synced", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Waiting for evidence")).toBeVisible();
  await expect(page.getByText("No data yet")).toBeVisible();
  await expect(page.getByText("0 patterns flagged")).toBeVisible();
  await expect(page.getByText("Import at least two months of transaction history")).toBeVisible();
  await expect(page.getByText("$0 redirected from overspend")).toBeVisible();
  await expect(page.getByText("Pattern question")).toHaveCount(0);
});

test("keeps Pattern Question hidden when only a new pattern is present", async ({ page }) => {
  await importFixture(page, "new-pattern-education.csv");

  await expect(page.getByRole("heading", { name: "New patterns to review" })).toBeVisible();
  await expect(page.getByText("Pattern question")).toHaveCount(0);
});

test("opens Pattern Lab from the Add context prompt", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Add context" }).click();

  await expect(page).toHaveURL(/\/insights/);
  await expect(page.getByRole("heading", { name: "Pattern Lab" })).toBeVisible();
});

test("customizes the saved-and-invested scenario", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "What-if" }).click();
  await page.getByLabel("Years").fill("20");
  await page.getByLabel("Annual return %").fill("9");

  await expect(page.getByText("Current scenario: 20 years at 9%. This is a what-if lens, not a promise.")).toBeVisible();
});

test("edits evidence category and private note", async ({ page }) => {
  await importFixture(page, "evidence-review.csv");

  await page.getByRole("link", { name: "Evidence" }).click();
  const firstEvidenceRow = page.getByTestId("evidence-row").first();
  await firstEvidenceRow.getByLabel("Category").selectOption("Education");
  await firstEvidenceRow.getByLabel("Private note").fill("Not lifestyle drift.");

  await expect(firstEvidenceRow.getByText("Changed from")).toBeVisible();
  await expect(firstEvidenceRow.getByLabel("Private note")).toHaveValue("Not lifestyle drift.");
  await expect(page.getByText("1 local edits")).toBeVisible();
});

test("recalculates scan metrics after evidence category edits", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await expect(page.getByText("$4,800 redirected from overspend")).toBeVisible();
  await page.getByRole("link", { name: "Evidence" }).click();
  await page.getByLabel("Search evidence").fill("2026-03-04");
  const barLuceRow = page.getByTestId("evidence-row").first();
  await barLuceRow.getByLabel("Category").selectOption("Education");

  await expect(page.getByText("Recalculated scan")).toBeVisible();
  await expect(page.locator("dl div", { hasText: "Overspend" }).getByText("$20", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Scan" }).click();

  await expect(page.getByText("$2,400 redirected from overspend")).toBeVisible();
  await expect(page.getByText("Old normal $20. Recent normal $40.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "New patterns to review" })).toBeVisible();
  await expect(page.getByText("Education").first()).toBeVisible();
  await expect(page.getByText("New pattern, not Drift").first()).toBeVisible();
});

test("recalculates when an already edited category is edited again", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Evidence" }).click();
  await page.getByLabel("Search evidence").fill("2026-03-04");
  const barLuceRow = page.getByTestId("evidence-row").first();

  await barLuceRow.getByLabel("Category").selectOption("Education");
  await expect(page.locator("dl div", { hasText: "Overspend" }).getByText("$20", { exact: true })).toBeVisible();

  await barLuceRow.getByLabel("Category").selectOption("Home");
  await expect(page.locator("dl div", { hasText: "Overspend" }).getByText("$20", { exact: true })).toBeVisible();
  await page.goto("/category/Home");
  await expect(page.getByText("Bar Luce").first()).toBeVisible();

  await page.getByRole("link", { name: "Evidence" }).click();
  await page.getByLabel("Search evidence").fill("2026-03-04");
  await page.getByTestId("evidence-row").first().getByLabel("Category").selectOption("Dining");

  await expect(page.locator("dl div", { hasText: "Overspend" }).getByText("$40", { exact: true })).toBeVisible();
  await expect(page.getByText("0 local edits")).toBeVisible();
});

test("filters and paginates evidence review", async ({ page }) => {
  await importFixture(page, "evidence-review.csv");

  await page.getByRole("link", { name: "Evidence" }).click();
  await expect(page.getByText("Page 1 of")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of")).toBeVisible();

  await page.getByLabel("Filter category").selectOption("Dining");
  await expect(page.getByText("Bar Luce").first()).toBeVisible();
  await page.getByLabel("Search evidence").fill("Nori");
  await expect(page.getByText("Nori House").first()).toBeVisible();
});

test("opens category detail from the scan evidence list", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Dining" }).first().click();

  await expect(page.getByRole("heading", { name: "Dining" })).toBeVisible();
  await expect(page.getByText("Monthly overspend")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(page.getByText("Bar Luce").first()).toBeVisible();
});

test("updates category detail after moving evidence into a new category", async ({ page }) => {
  await importFixture(page, "evidence-review.csv");

  await page.getByRole("link", { name: "Evidence" }).click();
  await page.getByLabel("Search evidence").fill("Bodega");
  const bodegaRow = page.getByTestId("evidence-row").first();
  await bodegaRow.getByLabel("Category").selectOption("Delivery");

  await page.goto("/category/Delivery");

  await expect(page.getByRole("heading", { name: "Delivery" })).toBeVisible();
  await expect(page.getByText("No longer active")).toBeVisible();
  await expect(page.getByText("Old monthly average", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent monthly average", { exact: true })).toBeVisible();
  await expect(page.getByText("Monthly averages are calculated across")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly timeline" })).toBeVisible();
  await expect(page.getByText("Bodega").first()).toBeVisible();

  await page.getByRole("link", { name: "Intercept" }).click();
  await expect(page.getByLabel("Category").locator('option[value="Delivery"]')).toHaveCount(0);
});

test("saves a Pattern Lab behavior tag and includes it in the report", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as {
      __DRIFT_AI_CLASSIFIER__: () => Promise<{ labels: string[]; scores: number[] }>;
      __DRIFT_FINANCIAL_CLASSIFIER__: () => Promise<Array<{ label: string; score: number }>>;
    }).__DRIFT_AI_CLASSIFIER__ = async () => ({
      labels: ["reward spending", "stress convenience", "habit creep"],
      scores: [0.91, 0.06, 0.03]
    });
    (window as unknown as {
      __DRIFT_FINANCIAL_CLASSIFIER__: () => Promise<Array<{ label: string; score: number }>>;
    }).__DRIFT_FINANCIAL_CLASSIFIER__ = async () => [
      { label: "negative", score: 0.88 }
    ];
  });
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Pattern Lab" }).click();
  await expect(page.getByText(/Model:/i)).toHaveCount(0);
  await page.getByLabel("Your private answer").fill("I got a new job and felt like I deserved nicer dinners.");
  await page.getByRole("button", { name: "Suggest behavior tag" }).click();

  await expect(page.getByLabel("Behavior tag")).toHaveValue("reward_spending");
  await expect(page.getByText(/AI suggested reward spending/i).first()).toBeVisible();
  await expect(page.getByText(/confidence/i)).toHaveCount(0);
  await page.getByLabel("Behavior tag").selectOption("intentional_upgrade");
  await page.getByRole("button", { name: "Save insight" }).click();

  await expect(page.locator("span").filter({ hasText: "Intentional upgrade" })).toBeVisible();
  await expect(page.getByText(/Dining is tagged as intentional upgrade/i)).toBeVisible();

  await page.getByRole("link", { name: "Report" }).click();
  await expect(page.getByRole("heading", { name: "Drift Scan report" })).toBeVisible();
  await expect(page.getByText("Dining · Intentional upgrade").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recovery path" })).toBeVisible();
  await expect(page.getByText("Sign in to generate this report").first()).toBeVisible();
  await expect(page.getByText("Financial AI review")).toBeVisible();
  await expect(page.getByText("Financial pressure")).toBeVisible();
});

test("simulates and saves a spend intercept decision", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Intercept" }).click();
  await expect(page.getByLabel("Merchant")).toHaveValue("");
  await expect(page.getByLabel("Amount")).toHaveValue("");
  await expect(page.getByLabel("Category")).toHaveValue("");
  await page.getByLabel("Merchant").fill("Bar Luce");
  await page.getByLabel("Amount").fill("72");
  await page.getByLabel("Category").selectOption("Dining");
  await page.getByRole("button", { name: "Simulate transaction" }).click();

  await expect(page.getByText("Intentionality check", { exact: true })).toBeVisible();
  await expect(page.getByText(/Dining is already above your old normal/i)).toBeVisible();

  await page.getByRole("button", { name: "Mark intentional" }).click();
  await expect(page.getByText("Dining marked intentional.")).toBeVisible();

  await page.getByRole("link", { name: "Report" }).click();
  await expect(page.getByText(/This is not about the \$72/i)).toBeVisible();
  await expect(page.getByText(/intentional Dining purchase inside a repeat Dining pattern/i)).toBeVisible();
  await expect(page.getByText(/Mark intentional/i)).toHaveCount(0);
});

test("persists local audit state across refresh and pages", async ({ page }) => {
  await importFixture(page, "evidence-review.csv");
  await page.getByRole("link", { name: "Evidence" }).click();

  const firstEvidenceRow = page.getByTestId("evidence-row").first();
  await firstEvidenceRow.getByLabel("Category").selectOption("Education");
  await firstEvidenceRow.getByLabel("Private note").fill("Persist this note.");
  await page.waitForTimeout(500);

  await page.reload();

  await expect(page.getByText("1 local edits")).toBeVisible();
  await expect(page.getByLabel("Private note").first()).toHaveValue("Persist this note.");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByText("Local edits", { exact: true })).toBeVisible();
  await expect(page.locator("dl div", { hasText: "Local edits" }).getByText("1", { exact: true })).toBeVisible();
});

test("wipes local audit data from the privacy page", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Privacy" }).click();
  await page.getByRole("button", { name: "Wipe local data" }).click();

  await expect(page.getByText("Not synced yet")).toBeVisible();
  await expect(page.locator("dl div", { hasText: "Behavior notes" }).getByText("0", { exact: true })).toBeVisible();
  await expect(page.locator("dl div", { hasText: "Intercept decisions" }).getByText("0", { exact: true })).toBeVisible();
});

test("keeps dark mode active across refreshes", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.addInitScript(() => window.localStorage.setItem("drift.theme", "dark"));
  await page.goto("/");

  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(consoleErrors.join("\n")).not.toMatch(/hydrated but some attributes/i);
});

test("opens the recovery plan after evidence exists", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Plan" }).click();
  await expect(page.getByRole("heading", { name: "Recovery plan" })).toBeVisible();
  await expect(page.getByText("Reset 60% of this drift").first()).toBeVisible();
});

test("keeps account and paid report surfaces product-native", async ({ page }) => {
  await importFixture(page, "sample-drift.csv");

  await page.getByRole("link", { name: "Account" }).click();
  await expect(page.getByRole("heading", { name: "Account sync" })).toBeVisible();
  await expect(page.getByText("does not upload raw transactions")).toBeVisible();

  await page.getByRole("link", { name: "Report" }).click();
  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 3 drift patterns" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New patterns to review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI behavior explanation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "30-day recovery path" })).toBeVisible();
  await expect(page.getByText("Sign in to generate this report").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
  await expect(page.getByText("Pay $1 to unlock report")).toHaveCount(0);
  await expect(page.getByText("Unlock report export")).toHaveCount(0);
  await expect(page.getByText(/Privacy note: raw transactions stayed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Proof" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Demo script" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Before\/After" })).toHaveCount(0);
});

test("shows only the centered Plaid sandbox sync UI", async ({ page }) => {
  await page.goto("/connect");

  await expect(page.getByRole("heading", { name: "Sandbox bank sync" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync sandbox transactions" })).toBeVisible();
  await expect(page.getByText("Backend routes ready")).toHaveCount(0);
  await expect(page.getByText("DRIFT_PLAID_CLIENT_ID")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Prepare Plaid Link" })).toHaveCount(0);
});
