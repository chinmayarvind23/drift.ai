import { expect, test } from "@playwright/test";

test("imports CSV and updates the Drift Scan dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import CSV").setInputFiles("tests/fixtures/sample-drift.csv");

  await expect(page.getByText("Imported 12 transactions from sample-drift.csv.")).toBeVisible();
  await expect(page.getByText("Imported CSV")).toBeVisible();
  await expect(page.getByText("Where did the raise go?")).toBeVisible();
  await expect(page.getByText("$2,123")).toBeVisible();
  await expect(page.getByText("$4,800 redirected from overspend")).toBeVisible();
  await expect(page.getByText("Old normal $20. Recent normal $60.")).toBeVisible();
});

test("loads a synthetic dummy user without requiring a CSV", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("nina-stress-convenience");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await expect(page.getByText("Loaded 90 synthetic transactions for Nina Patel.")).toBeVisible();
  await expect(page.getByText("Stress convenience spending:")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Delivery" })).toBeVisible();
});

test("customizes the saved-and-invested scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("maya-new-job");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await page.getByRole("link", { name: "What-if" }).click();
  await page.getByLabel("Years").fill("20");
  await page.getByLabel("Annual return %").fill("9");

  await expect(page.getByText("Current scenario: 20 years at 9%. This is a what-if lens, not a promise.")).toBeVisible();
});

test("edits evidence category and private note", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("maya-new-job");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await page.getByRole("link", { name: "Evidence" }).click();
  const firstEvidenceRow = page.locator("section", { hasText: "Evidence review" }).locator(".grid").nth(1);
  await firstEvidenceRow.getByLabel("Category").selectOption("Education");
  await firstEvidenceRow.getByLabel("Private note").fill("Not lifestyle drift.");

  await expect(firstEvidenceRow.getByText("Changed from")).toBeVisible();
  await expect(firstEvidenceRow.getByLabel("Private note")).toHaveValue("Not lifestyle drift.");
  await expect(page.getByText("1 local edits")).toBeVisible();
});

test("filters and paginates evidence review", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("maya-new-job");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await page.getByRole("link", { name: "Evidence" }).click();
  await expect(page.getByText("Page 1 of")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of")).toBeVisible();

  await page.getByLabel("Filter category").selectOption("Dining");
  await expect(page.getByText("Bar Luce").first()).toBeVisible();
  await page.getByLabel("Search evidence").fill("Nori");
  await expect(page.getByText("Nori House").first()).toBeVisible();
});

test("persists local audit state across refresh and pages", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("maya-new-job");
  await page.getByRole("button", { name: "Load test profile" }).click();
  await page.getByRole("link", { name: "Evidence" }).click();

  const firstEvidenceRow = page.locator("section", { hasText: "Evidence review" }).locator(".grid").nth(1);
  await firstEvidenceRow.getByLabel("Category").selectOption("Education");
  await firstEvidenceRow.getByLabel("Private note").fill("Persist this note.");

  await page.reload();

  await expect(page.getByText("1 local edits")).toBeVisible();
  await expect(page.getByLabel("Private note").first()).toHaveValue("Persist this note.");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByText("Local edits", { exact: true })).toBeVisible();
  await expect(page.locator("dl div", { hasText: "Local edits" }).getByText("1", { exact: true })).toBeVisible();
});

test("toggles dark mode and opens the recovery plan", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("drift.theme", "light"));
  await page.goto("/");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("link", { name: "Plan" }).click();
  await expect(page.getByRole("heading", { name: "Recovery plan" })).toBeVisible();
  await expect(page.getByText("Reset 60% of this drift").first()).toBeVisible();
});

test("shows Plaid sandbox setup without requiring credentials", async ({ page }) => {
  await page.goto("/connect");

  await expect(page.getByRole("heading", { name: "Bank connection" })).toBeVisible();
  await expect(page.getByText("DRIFT_PLAID_CLIENT_ID")).toBeVisible();
  await expect(page.getByText("/plaid/sandbox/public-token")).toBeVisible();
});
