import { expect, test, type Page } from "@playwright/test";

test("crash choice preview covers item selection, self-rescue, and report", async ({ page }) => {
  await page.goto("/crash-choice-preview");
  await expect(page.getByText("UI PREVIEW · choices here are not sent to a live session")).toBeVisible();
  await expect(page.getByRole("group", { name: "Choose one starting item" }).getByRole("button")).toHaveCount(3);
  await page.getByRole("button", { name: "Rescue choice" }).click();
  await page.getByRole("button", { name: /Tony.*you/ }).click();
  await expect(page.getByText(/Rescue target selected/)).toBeVisible();
  await page.getByRole("button", { name: "Crash report" }).click();
  await expect(page.getByRole("heading", { name: "The rescue attempts are in" })).toBeVisible();
  await expect(page.getByRole("listitem")).toContainText("Tony tried to save Daniel");
});

test("crash choice preview fits a mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/crash-choice-preview");
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noOverflow).toBe(true);
  await expect(page.getByRole("heading", { name: "Choose what you carried out" })).toBeVisible();
});

test("three connected players choose items, reconnect, share a rescue report, and vote on the first decision", async ({ browser }) => {
  test.setTimeout(150_000);
  const players = await Promise.all([browser.newPage(), browser.newPage(), browser.newPage()]);
  const [host, friend, reconnectingPlayer] = players as [Page, Page, Page];
  const pageErrors: string[] = [];
  for (const player of players) player.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await host.goto("/");
    await host.getByRole("button", { name: "Start game" }).click();
    await host.getByLabel("Your name").fill("Tony");
    await host.getByLabel("Room password").fill("island123");
    await host.getByRole("button", { name: "Create private session" }).click();
    await expect(host.getByRole("heading", { name: "Choose a survivor" })).toBeVisible();
    const code = await host.getByLabel("Session code").locator("strong").innerText();

    async function join(player: Page, name: string, character: RegExp) {
      await player.goto("/");
      await player.getByRole("button", { name: "Join game" }).click();
      await player.getByLabel("Room code").fill(code);
      await player.getByLabel("Joining name").fill(name);
      await player.getByLabel("Joining password").fill("island123");
      await player.getByRole("button", { name: "Join session" }).click();
      await player.getByRole("button", { name: character }).click();
      await player.getByRole("button", { name: "Ready up" }).click();
    }

    await host.getByRole("button", { name: /Daniel/ }).click();
    await host.getByRole("button", { name: "Ready up" }).click();
    await join(friend, "Courtney", /Samantha/);
    await join(reconnectingPlayer, "Michelle", /Jim Young/);
    await expect(host.getByRole("heading", { name: /Passenger manifest.*3\/8 connected/i })).toBeVisible();
    await host.getByRole("button", { name: "Start the crash" }).click();

    await expect(host.getByRole("region", { name: "Live island and crew" })).toBeVisible();
    await expect(host.getByText("The flight is going badly")).toBeVisible();
    await expect(host.getByText("CREW THOUGHTS")).toBeVisible();
    await expect(host.getByRole("list", { name: "Players on the island" }).getByText("Tony as Daniel")).toBeVisible();
    await expect(host.getByRole("heading", { name: "Choose what you carried out" })).toBeVisible({ timeout: 45_000 });
    await expect(friend.getByRole("heading", { name: "Choose what you carried out" })).toBeVisible();
    await expect(reconnectingPlayer.getByRole("heading", { name: "Choose what you carried out" })).toBeVisible();
    const itemGroup = reconnectingPlayer.getByRole("group", { name: "Choose one starting item" });
    const reconnectedOffer = await itemGroup.getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.innerText));
    await itemGroup.getByRole("button").nth(1).click();
    await expect(reconnectingPlayer.getByText(/Selected:/)).toBeVisible();
    const selectedItemMessage = await reconnectingPlayer.locator("[aria-live='polite']").last().innerText();
    await reconnectingPlayer.reload();
    await expect(reconnectingPlayer.getByRole("heading", { name: "Choose what you carried out" })).toBeVisible({ timeout: 15_000 });
    const offerAfterReconnect = await reconnectingPlayer.getByRole("group", { name: "Choose one starting item" }).getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.innerText));
    expect(offerAfterReconnect).toEqual(reconnectedOffer);
    await expect(reconnectingPlayer.locator("[aria-live='polite']").last()).toHaveText(selectedItemMessage);

    await host.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await friend.getByRole("group", { name: "Choose one starting item" }).getByRole("button").first().click();
    await expect(host.getByRole("heading", { name: "Who do you try to save?" })).toBeVisible({ timeout: 10_000 });
    await expect(friend.getByRole("heading", { name: "Who do you try to save?" })).toBeVisible();
    await expect(reconnectingPlayer.getByRole("heading", { name: "Who do you try to save?" })).toBeVisible();

    for (const player of players) await player.getByRole("group", { name: "Choose a rescue target" }).getByRole("button", { name: /Samantha/ }).click();
    for (const player of players) await expect(player.getByRole("heading", { name: "The rescue attempts are in" })).toBeVisible({ timeout: 8_000 });
    const reports = await Promise.all(players.map((player) => player.locator("section[aria-labelledby='crash-report-title']").innerText()));
    expect(reports[1]).toBe(reports[0]);
    expect(reports[2]).toBe(reports[0]);
    await host.screenshot({ path: "test-results/crash-report-live-desktop.png", fullPage: true });

    await expect(host.locator("section[aria-labelledby='decision-question']")).toBeVisible({ timeout: 20_000 });
    await host.screenshot({ path: "test-results/crash-choice-live-desktop.png", fullPage: true });
    await expect(host.locator("section[aria-labelledby='decision-question'] button").first()).toBeEnabled({ timeout: 30_000 });
    for (const player of players) {
      await player.locator("section[aria-labelledby='decision-question'] button").first().click();
      await expect(player.locator("section[aria-labelledby='decision-question'] button").first()).toHaveAttribute("data-submitted", "true");
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await Promise.all(players.map((player) => player.close()));
  }
});
