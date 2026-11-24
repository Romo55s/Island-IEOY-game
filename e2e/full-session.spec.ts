import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function clearBlockingChoice(pages: Page[]): Promise<boolean> {
  for (const page of pages) {
    const nomination = page.getByRole("dialog");
    if (await nomination.isVisible().catch(() => false)) {
      const nominee = nomination.getByRole("button", { name: /living and eligible/ }).first();
      if (await nominee.isVisible().catch(() => false)) {
        await nominee.click();
        await nomination.getByRole("button", { name: "Confirm nominee" }).click();
        return true;
      }
    }
    const privateChoice = page.locator("[aria-label='Private choice'] button:not([disabled])").first();
    if (await privateChoice.isVisible().catch(() => false)) {
      await privateChoice.click();
      return true;
    }
    const assignmentChoice = page.locator("[aria-label='Assignment response'] button:not([disabled])").first();
    if (await assignmentChoice.isVisible().catch(() => false)) {
      await assignmentChoice.click();
      return true;
    }
  }
  return false;
}

async function castFirstGroupVote(page: Page): Promise<void> {
  const firstOption = page.locator("section[aria-labelledby='decision-question'] button[data-option]").first();
  if (await firstOption.isDisabled()) {
    const nominationTrigger = page.locator("section[aria-labelledby='decision-question'] button[aria-haspopup='dialog']").first();
    if (await nominationTrigger.isVisible().catch(() => false)) {
      await nominationTrigger.click();
      const nomination = page.getByRole("dialog");
      await nomination.getByRole("button", { name: /living and eligible/ }).first().click();
      await nomination.getByRole("button", { name: "Confirm nominee" }).click();
    }
  }
  await firstOption.click();
}

async function waitForGroupDecision(pages: Page[]): Promise<"decision" | "ending"> {
  const host = pages[0]!;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await host.locator("#ending-title").isVisible().catch(() => false)) {
      console.info("[campaign e2e] terminal ending reached");
      return "ending";
    }
    if (await host.locator("section[aria-labelledby='decision-question']").isVisible().catch(() => false)) return "decision";
    if (!await clearBlockingChoice(pages)) await host.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for a decision or ending. Current screen: ${(await host.locator("main").innerText().catch(() => "unavailable")).slice(0, 800)}`);
}

test("two connected players follow the campaign to a terminal ending", async ({ browser }) => {
  test.setTimeout(900_000);
  const evidenceDir = "output/playwright/adaptive-cinematic-ui";
  await mkdir(evidenceDir, { recursive: true });
  const host = await browser.newPage();
  const friend = await browser.newPage();
  const pages = [host, friend];
  const pageErrors: string[] = [];
  for (const page of pages) page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await host.goto("/");
    await host.getByRole("button", { name: "Start game" }).click();
    await host.getByLabel("Your name").fill("Demo Host");
    await host.getByLabel("Room password").fill("full-demo-pass");
    await host.getByRole("button", { name: "Create private session" }).click();
    await host.getByRole("button", { name: /Daniel/ }).click();
    await host.getByRole("button", { name: "Ready up" }).click();
    const code = await host.getByLabel("Session code").locator("strong").innerText();

    await friend.goto("/");
    await friend.getByRole("button", { name: "Join game" }).click();
    await friend.getByLabel("Room code").fill(code);
    await friend.getByLabel("Joining name").fill("Demo Friend");
    await friend.getByLabel("Joining password").fill("full-demo-pass");
    await friend.getByRole("button", { name: "Join session" }).click();
    await friend.getByRole("button", { name: /Samantha/ }).click();
    await friend.getByRole("button", { name: "Ready up" }).click();
    await host.getByRole("button", { name: "Start the crash" }).click();

    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Choose what you carried out" }).waitFor({ timeout: 45_000 })));
    await expect(host.getByRole("heading", { name: "Passenger manifest" })).toBeVisible();
    await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
    await host.screenshot({ path: `${evidenceDir}/crash-item-choice-desktop.png` });
    await host.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await host.screenshot({ path: `${evidenceDir}/crash-item-choice-mobile.png` });
    await host.setViewportSize({ width: 1440, height: 900 });
    await host.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await friend.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Who do you try to save?" }).waitFor({ timeout: 10_000 })));
    await host.getByRole("group", { name: "Choose a rescue target" }).getByRole("button", { name: /Samantha/ }).click();
    await friend.getByRole("group", { name: "Choose a rescue target" }).getByRole("button", { name: /Samantha/ }).click();
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "The rescue attempts are in" }).waitFor({ timeout: 10_000 })));
    await host.screenshot({ path: `${evidenceDir}/crash-rescue-report.png` });

    let completedDecisions = 0;
    let lastDecision = "none";
    for (let decision = 1; decision <= 40; decision += 1) {
      const next = await waitForGroupDecision(pages);
      if (next === "ending") break;
      await expect(host.locator("section[aria-labelledby='decision-question']")).toBeVisible({ timeout: 25_000 });
      completedDecisions = decision;
      lastDecision = await host.locator("section[aria-labelledby='decision-question']").innerText();
      console.info(`[campaign e2e] decision ${decision}: ${lastDecision.split("\n")[0]}`);
      await expect(host.getByRole("heading", { name: "Passenger manifest" })).toBeVisible();
      await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
      if (decision === 1) await host.screenshot({ path: `${evidenceDir}/decision-vote-desktop.png` });
      await castFirstGroupVote(pages[0]!);
      await expect(host.getByRole("region", { name: "Visible group votes" })).toContainText("Demo Host");
      await expect(friend.getByRole("region", { name: "Visible group votes" })).toContainText("Demo Host");
      await expect(host.getByRole("heading", { name: "Vote results" })).toHaveCount(0);
      if (decision === 1) {
        await host.screenshot({ path: `${evidenceDir}/decision-waiting-desktop.png` });
        await host.setViewportSize({ width: 390, height: 844 });
        await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect.poll(() => host.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        await host.screenshot({ path: `${evidenceDir}/decision-waiting-mobile.png` });
        await host.setViewportSize({ width: 1440, height: 900 });
      }
      await castFirstGroupVote(pages[1]!);
      const eventHeading = host.getByRole("heading", { name: /The crew chose/ });
      const endingHeading = host.locator("#ending-title");
      await expect.poll(async () => await eventHeading.isVisible() || await endingHeading.isVisible(), { timeout: 30_000 }).toBe(true);
      if (await endingHeading.isVisible()) {
        await expect(friend.locator("#ending-title")).toHaveText(await endingHeading.innerText());
        await host.screenshot({ path: `${evidenceDir}/ending-aftermath.png` });
        break;
      }
      await expect(eventHeading).toBeVisible();
      await expect(friend.getByRole("heading", { name: /The crew chose/ })).toHaveText(await eventHeading.innerText());
      await expect(host.getByRole("heading", { name: "Vote results" })).toBeVisible();
      if (decision === 1 || decision % 5 === 0) await host.screenshot({ path: `${evidenceDir}/decision-${String(decision).padStart(2, "0")}-incident-report.png` });
    }

    const endingHeading = host.locator("#ending-title");
    await expect(endingHeading, `Campaign did not end within 40 transitions. Last decision (${completedDecisions}): ${lastDecision}`).toBeVisible({ timeout: 25_000 });
    await expect(friend.locator("#ending-title")).toHaveText(await endingHeading.innerText());
    await expect(host.getByText(/survivor/)).toBeVisible();
    await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
    await host.screenshot({ path: `${evidenceDir}/ending-aftermath-desktop.png` });
    await host.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await host.screenshot({ path: `${evidenceDir}/ending-aftermath-mobile.png` });
    expect(pageErrors).toEqual([]);
  } finally {
    await Promise.all(pages.map((page: Page) => page.close()));
  }
});
