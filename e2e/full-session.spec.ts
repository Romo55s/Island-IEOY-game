import { expect, test, type Page } from "@playwright/test";

async function clearBlockingChoice(pages: Page[]): Promise<boolean> {
  for (const page of pages) {
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

async function waitForGroupDecision(pages: Page[]): Promise<void> {
  const host = pages[0]!;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await host.locator("section[aria-labelledby='decision-question']").isVisible().catch(() => false)) return;
    if (!await clearBlockingChoice(pages)) await host.waitForTimeout(250);
  }
  throw new Error("Timed out waiting for the next group decision.");
}

test("two connected players complete all ten decisions and reach the ending", async ({ browser }) => {
  test.setTimeout(900_000);
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
    await host.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await friend.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Who do you try to save?" }).waitFor({ timeout: 10_000 })));
    await host.getByRole("group", { name: "Choose a rescue target" }).getByRole("button", { name: /Samantha/ }).click();
    await friend.getByRole("group", { name: "Choose a rescue target" }).getByRole("button", { name: /Samantha/ }).click();
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "The rescue attempts are in" }).waitFor({ timeout: 10_000 })));

    for (let decision = 1; decision <= 10; decision += 1) {
      await waitForGroupDecision(pages);
      await expect(host.locator("section[aria-labelledby='decision-question']")).toBeVisible({ timeout: 25_000 });
      const chosenLabel = await host.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first().locator("span").nth(1).innerText();
      await Promise.all(pages.map(async (page) => {
        await expect(page.locator("section[aria-labelledby='decision-question']")).toBeVisible({ timeout: 25_000 });
        await expect(page.getByLabel("Live island and crew")).toHaveAttribute("data-phase", "decision");
        const firstOption = page.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first();
        await expect(firstOption).toBeEnabled({ timeout: 30_000 });
        await firstOption.click();
        await expect(firstOption).toHaveAttribute("data-submitted", "true");
      }));

      if (decision === 1 || decision === 5) await host.screenshot({ path: `test-results/full-session-vote-${decision}.png`, fullPage: true });
      const eventCount = String(decision + 1); // crash-resolution event plus each completed decision
      await expect(host.getByLabel("Live island and crew")).toHaveAttribute("data-history-count", eventCount, { timeout: 45_000 });
      await expect(friend.getByLabel("Live island and crew")).toHaveAttribute("data-history-count", eventCount, { timeout: 10_000 });
      const eventHeading = host.getByRole("heading", { name: /The crew chose/ });
      await expect(eventHeading).toContainText(`The crew chose “${chosenLabel}.”`);
      if (decision === 1 || decision === 5) await host.screenshot({ path: `test-results/full-session-reveal-${decision}.png`, fullPage: true });
    }

    const endingHeading = host.locator("#ending-title");
    await expect(endingHeading).toBeVisible({ timeout: 25_000 });
    await expect(friend.locator("#ending-title")).toHaveText(await endingHeading.innerText());
    await expect(host.getByText(/survivor/)).toBeVisible();
    await host.screenshot({ path: "test-results/full-session-ending.png", fullPage: true });
    expect(pageErrors).toEqual([]);
  } finally {
    await Promise.all(pages.map((page: Page) => page.close()));
  }
});
