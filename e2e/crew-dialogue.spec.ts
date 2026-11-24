import { expect, test } from "@playwright/test";

test("contextual dialogue matches the decision and its saved result with a full cast", async ({ page }) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/decision-test");
  await expect(page.getByRole("heading", { name: "Decision test bench" })).toBeVisible();
  await page.getByLabel("3D portraits").uncheck();
  await page.getByLabel("Test crew size").selectOption("16");
  await page.getByLabel("Story decision").selectOption("campaign-shelter-reinforcement");

  const radio = page.getByLabel("Crew radio");
  await expect(radio).toContainText("Before we build, can we agree what 'shelter' means for tonight?");
  await expect(radio).toContainText("Scope suggestion: dry enough to sleep.");
  await page.screenshot({ path: "output/qa/crew-dialogue/decision-opening-full-roster-16.png" });

  await page.getByRole("button", { name: "Raise the sleeping area above the runoff" }).click();
  await page.getByLabel("Outcome to preview").selectOption("raised-sleeping-area");
  await page.getByRole("button", { name: "Simulate crew agreement" }).click();
  await page.getByRole("button", { name: "Resolve preview" }).click();

  const report = page.getByRole("region", { name: /The crew chose/ });
  await expect(report).toContainText("The crew raises the sleeping platform.");
  await expect(radio).toContainText(/sleeping platform|platform is up/);
  await expect(radio).toContainText(/That gives the crew a drier sleeping area|Good work/);
  await page.screenshot({ path: "output/qa/crew-dialogue/resolved-shelter-and-radio.png" });

  const outcomeText = await report.locator("p").first().innerText();
  const resourceText = await report.getByRole("region", { name: "What actually changed" }).innerText();
  await page.getByRole("button", { name: /Reroll dialogue/ }).click();
  await expect(report).toContainText("The crew raises the sleeping platform.");
  expect(await report.locator("p").first().innerText()).toBe(outcomeText);
  expect(await report.getByRole("region", { name: "What actually changed" }).innerText()).toBe(resourceText);
  await page.screenshot({ path: "output/qa/crew-dialogue/dialogue-rerolled-result-stable.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /Radio/ })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "output/qa/crew-dialogue/mobile-radio-access.png", fullPage: true });
  expect(pageErrors).toEqual([]);
});
