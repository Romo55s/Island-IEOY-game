import { expect, test, type Page } from "@playwright/test";

const crew = [
  { name: "Agent 1", character: "Daniel" },
  { name: "Agent 2", character: "Samantha" },
  { name: "Agent 3", character: "Jim Young" },
  { name: "Agent 4", character: "Esther Morgan" },
  { name: "Agent 5", character: "Tim" },
  { name: "Agent 6", character: "Tony" },
  { name: "Agent 7", character: "Michelle" },
  { name: "Agent 8", character: "Jacob Ramirez" },
];

async function joinCrew(page: Page, code: string, name: string, character: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Join game" }).click();
  await page.getByLabel("Room code").fill(code);
  await page.getByLabel("Joining name").fill(name);
  await page.getByLabel("Joining password").fill("eight-player-test");
  await page.getByRole("button", { name: "Join session" }).click();
  await page.getByRole("button", { name: `${character}: Available` }).click();
  await page.getByRole("button", { name: "Ready up" }).click();
}

async function voteFirstOption(page: Page): Promise<void> {
  const decision = page.locator("section[aria-labelledby='decision-question']");
  const firstOption = decision.locator("button[data-option]").first();
  if (await firstOption.isDisabled()) {
    const nominate = decision.locator("button[aria-haspopup='dialog']").first();
    if (await nominate.isVisible().catch(() => false)) {
      await nominate.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /living and eligible/ }).first().click();
      await dialog.getByRole("button", { name: "Confirm nominee" }).click();
    }
  }
  await firstOption.click();
}

test("eight browser agents join, play the crash choices, and resolve a shared vote", async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "__IEOY_E2E_STATIC_PORTRAITS__", { value: true });
  });
  const pages = await Promise.all(crew.map(() => context.newPage()));
  const pageErrors: string[] = [];
  for (const page of pages) page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const host = pages[0]!;
    await host.goto("/");
    await host.getByRole("button", { name: "Start game" }).click();
    await host.getByLabel("Your name").fill(crew[0]!.name);
    await host.getByLabel("Room password").fill("eight-player-test");
    await host.getByRole("button", { name: "Create private session" }).click();
    await host.getByRole("button", { name: "Daniel: Available" }).click();
    await host.getByRole("button", { name: "Ready up" }).click();
    const code = await host.getByLabel("Session code").locator("strong").innerText();

    await Promise.all(pages.slice(1).map((page, index) => {
      const player = crew[index + 1]!;
      return joinCrew(page, code, player.name, player.character);
    }));
    await expect(host.getByText("Passenger manifest · 8/15 connected")).toBeVisible({ timeout: 30_000 });
    await expect(host.getByRole("button", { name: "Start the crash" })).toBeEnabled();
    await host.screenshot({ path: "output/playwright/eight-player-lobby.png" });
    await host.getByRole("button", { name: "Start the crash" }).click();

    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Choose what you carried out" }).waitFor({ timeout: 45_000 })));
    await Promise.all(pages.map((page) => page.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click()));
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Who do you try to save?" }).waitFor({ timeout: 15_000 })));
    await Promise.all(pages.map((page) => page.getByRole("group", { name: "Choose a rescue target" }).getByRole("button").first().click()));
    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "The rescue attempts are in" }).waitFor({ timeout: 20_000 })));

    const decision = host.locator("section[aria-labelledby='decision-question']");
    await expect(decision).toBeVisible({ timeout: 45_000 });
    await Promise.all(pages.slice(0, 7).map((page) => voteFirstOption(page)));
    await expect.poll(async () => await host.getByRole("region", { name: "Visible group votes" }).locator("li").count(), { timeout: 15_000 }).toBe(7);
    for (const page of pages) {
      await expect(page.getByRole("region", { name: "Visible group votes" }).locator("li")).toHaveCount(7);
    }
    await host.screenshot({ path: "output/playwright/eight-player-seven-votes.png" });

    console.info("[eight-player e2e] first seven ballots visible to all eight clients");
    const finalVoteStartedAt = Date.now();
    await voteFirstOption(pages[7]!);
    console.info("[eight-player e2e] eighth ballot submitted; waiting for resolved reports");
    await Promise.all(pages.map(async (page, index) => {
      await expect(page.getByRole("heading", { name: "Vote results" })).toBeVisible({ timeout: 10_000 });
      console.info(`[eight-player e2e] client ${index + 1} received results`);
    }));
    expect(Date.now() - finalVoteStartedAt).toBeLessThan(10_000);
    const voteResultsSection = host.getByRole("heading", { name: "Vote results" }).locator("..");
    await expect(voteResultsSection.getByRole("listitem").first().locator("b")).toHaveText("8");
    await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
    await host.screenshot({ path: "output/playwright/eight-player-vote-resolved.png" });
    expect(pageErrors).toEqual([]);
    console.info("[eight-player e2e] checks complete; closing browser context");
  } finally {
    await context.close();
    console.info("[eight-player e2e] browser context closed");
  }
});
