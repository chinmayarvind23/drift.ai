import { expect, test } from "@playwright/test";

test("imports CSV and updates the Drift Scan dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import CSV").setInputFiles("tests/fixtures/sample-drift.csv");

  await expect(page.getByText("Imported 12 transactions from sample-drift.csv.")).toBeVisible();
  await expect(page.getByText("Imported CSV")).toBeVisible();
  await expect(page.getByText("Where did the raise go?")).toBeVisible();
  await expect(page.getByText("$6,923")).toBeVisible();
  await expect(page.getByText("Old normal $20. Recent normal $60.")).toBeVisible();
});

test("loads a synthetic dummy user without requiring a CSV", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("nina-stress-convenience");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await expect(page.getByText("Loaded 90 synthetic transactions for Nina Patel.")).toBeVisible();
  await expect(page.getByText("Stress convenience spending:")).toBeVisible();
  await expect(page.getByText("Delivery")).toBeVisible();
});

test("customizes the saved-and-invested scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Test profile").selectOption("maya-new-job");
  await page.getByRole("button", { name: "Load test profile" }).click();

  await page.getByLabel("Years").fill("20");
  await page.getByLabel("Annual return %").fill("9");

  await expect(page.getByText("Current scenario: 20 years at 9%.")).toBeVisible();
});
