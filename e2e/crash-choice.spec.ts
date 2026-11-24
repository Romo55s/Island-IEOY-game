import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

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
  const evidenceDir = "output/playwright/adaptive-cinematic-ui";
  await mkdir(evidenceDir, { recursive: true });
  const players = await Promise.all([browser.newPage(), browser.newPage(), browser.newPage()]);
  const [host, friend, reconnectingPlayer] = players as [Page, Page, Page];
  const pageErrors: string[] = [];
  const requestedCharacterModels = new Set<string>();
  for (const player of players) player.on("pageerror", (error) => pageErrors.push(error.message));
  host.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (/^\/models\/characters\/[^/]+\.glb$/u.test(pathname)) requestedCharacterModels.add(pathname);
  });

  try {
    await host.goto("/");
    await host.getByRole("button", { name: "Start game" }).click();
    await host.getByLabel("Your name").fill("Tony");
    await host.getByRole("button", { name: "Create crew session" }).click();
    await expect(host.getByRole("heading", { name: "Choose a survivor" }).last()).toBeVisible();
    const code = await host.getByLabel("Session code").locator("strong").innerText();

    async function join(player: Page, name: string, character: RegExp) {
      await player.goto("/");
      await player.getByRole("button", { name: "Join game" }).click();
      await player.getByLabel("Room code").fill(code);
      await player.getByLabel("Joining name").fill(name);
      await player.getByRole("button", { name: "Join session" }).click();
      await player.getByRole("button", { name: character }).click();
      await player.getByRole("button", { name: "Ready up" }).click();
    }

    await host.getByRole("button", { name: /Daniel/ }).click();
    await expect.poll(() => [...requestedCharacterModels].filter((path) => !path.includes("animation-library")).length).toBeGreaterThan(0);
    expect([...requestedCharacterModels].filter((path) => !path.includes("animation-library")).length).toBeLessThan(16);
    await host.getByRole("button", { name: "Ready up" }).click();
    await join(friend, "Courtney", /Samantha/);
    await join(reconnectingPlayer, "Michelle", /Jim Young/);
    await host.getByRole("button", { name: "Start the crash" }).click();

    await expect(host.getByRole("region", { name: "Current story scene" })).toBeVisible();
    await expect(host.getByText("3/16 LINKED")).toBeVisible();
    await expect(host.locator("[class*='fullIdentity']")).toHaveCSS("white-space", "nowrap");
    await expect(host.locator("[data-scope='character']").first()).toHaveAttribute("aria-label", /Your food:/);
    await expect(host.locator("[data-scope='crew']")).toHaveAttribute("aria-label", /Crew shelter:/);
    await expect(host.getByRole("heading", { name: "Passenger manifest" })).toBeVisible();
    await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
    await expect(host.getByText("Tony as Daniel")).toBeVisible();
    await host.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(host.locator("[aria-label='Session code'] span")).toHaveCSS("white-space", "nowrap");
    await expect.poll(() => host.locator("[aria-label='Session code']").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await host.screenshot({ path: `${evidenceDir}/gameplay-tablet-header.png` });
    await host.setViewportSize({ width: 1280, height: 720 });
    const pauseButton = host.getByRole("button", { name: "Open menu and volume settings" });
    await expect(pauseButton).toBeVisible();
    await pauseButton.click();
    const pauseDialog = host.getByRole("dialog", { name: "Black-box pause menu" });
    await expect(pauseDialog).toBeVisible();
    await expect(host.getByRole("heading", { name: "Black-box settings" })).toBeVisible();
    await host.screenshot({ path: `${evidenceDir}/pause-settings-desktop.png` });
    await host.keyboard.press("Shift+Tab");
    await expect(host.getByRole("button", { name: "Leave session" })).toBeFocused();
    await host.keyboard.press("Tab");
    await expect(host.getByRole("slider", { name: "Master volume" })).toBeFocused();
    await host.keyboard.press("Escape");
    await expect(pauseDialog).toBeHidden();
    await expect(pauseButton).toBeFocused();
    await host.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await host.screenshot({ path: `${evidenceDir}/gameplay-mobile-header.png` });
    await host.getByRole("button", { name: "Radio · 3" }).click();
    await expect(host.getByRole("complementary", { name: "Crew manifest and radio" })).toBeVisible();
    await expect(host.getByRole("heading", { name: "Crew radio" })).toBeVisible();
    await host.screenshot({ path: `${evidenceDir}/crew-radio-mobile-drawer.png` });
    await host.getByRole("button", { name: "Close crew panel" }).click();
    await host.setViewportSize({ width: 1280, height: 720 });
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
    await expect(host.locator("section[aria-labelledby='decision-question'] button").first()).toBeEnabled({ timeout: 3_000 });
    const firstOptionLabel = await host.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first().locator("span").nth(1).innerText();
    await host.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first().click();
    const hostVote = host.getByRole("region", { name: "Visible group votes" });
    const friendVote = friend.getByRole("region", { name: "Visible group votes" });
    await expect(hostVote).toContainText("Tony");
    await expect(friendVote).toContainText("Tony");
    await expect(friendVote).toContainText(firstOptionLabel);
    const replacementOption = host.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").nth(1);
    const replacementLabel = await replacementOption.locator("span").nth(1).innerText();
    await replacementOption.click();
    const hostBallot = hostVote.locator("li").filter({ hasText: "Tony" });
    const friendBallot = friendVote.locator("li").filter({ hasText: "Tony" });
    await expect(hostBallot).toContainText(replacementLabel);
    await expect(hostBallot).not.toContainText(firstOptionLabel);
    await expect(friendBallot).toContainText(replacementLabel);
    await expect(friendBallot).not.toContainText(firstOptionLabel);
    await friend.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first().click();
    await expect(hostVote).toContainText("Courtney");
    await expect(friendVote).toContainText("Courtney");
    await reconnectingPlayer.locator("section[aria-labelledby='decision-question'] button:not(:disabled)").first().click();
    await expect(host.getByRole("heading", { name: "Vote results" })).toBeVisible({ timeout: 5_000 });
    for (const player of players) {
      const skipDialogue = player.getByRole("button", { name: "Show full conversation" });
      if (await skipDialogue.isVisible()) await skipDialogue.click();
    }
    const radioElements = players.map((player) => player.locator("[class*='radioHistory'] [class*='voice'] p"));
    await expect.poll(async () => {
      const texts = await Promise.all(radioElements.map((locator) => locator.allInnerTexts()));
      return texts.every((lines) => lines.every((line) => !line.includes("▌")));
    }, { timeout: 8_000 }).toBe(true);
    const radioLines = await Promise.all(radioElements.map((locator) => locator.allInnerTexts()));
    expect(radioLines[1]).toEqual(radioLines[0]);
    expect(radioLines[2]).toEqual(radioLines[0]);
    const reportLines = await host.locator("[class*='reportVoice'] p").allInnerTexts();
    expect(reportLines).toEqual(radioLines[0].map((line) => line.split("\n").at(-1)));
    await host.screenshot({ path: `${evidenceDir}/incident-report-cinematic.png` });
    await host.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await host.screenshot({ path: `${evidenceDir}/incident-report-cinematic-mobile.png` });
    expect(pageErrors).toEqual([]);
  } finally {
    await Promise.all(players.map((player) => player.close()));
  }
});
