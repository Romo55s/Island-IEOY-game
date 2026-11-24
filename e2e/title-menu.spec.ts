import { expect, test } from "@playwright/test";

test("title menu supports keyboard navigation and preserves the session forms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Island of Extremely Questionable Judgment" })).toBeVisible();
  const start = page.getByRole("button", { name: "Start game" });
  await start.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Join game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/join-crew$/);
  await expect(page.getByRole("button", { name: "Join session" })).toBeVisible();
  await expect(page.getByLabel("Room code")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(start).toBeVisible();

  await start.click();
  await expect(page).toHaveURL(/\/start-crew$/);
  await expect(page.getByRole("button", { name: "Create private session" })).toBeVisible();
  await expect(page.getByLabel("Room code")).not.toBeVisible();
});

test("crew admission pages stay compact and keyboard-operable at desktop and mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/sessions", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "BAD_REQUEST", message: "Test transmission rejected." } }),
  }));
  await page.goto("/start-crew");
  await expect(page.getByRole("heading", { name: "Start a crew" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await page.getByLabel("Your name").fill("Mara");
  await page.getByLabel("Room password").fill("crash-site");
  await page.getByLabel("Room password").press("Enter");
  await expect(page.getByRole("alert")).toContainText("Test transmission rejected.");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/join-crew");
  await expect(page.getByRole("heading", { name: "Join a crew" })).toBeVisible();
  await expect(page.getByLabel("Room code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join session" })).toBeVisible();
});

test("a newly created crew carries its initial ticket into the lobby", async ({ page }) => {
  await page.goto("/start-crew");
  await page.getByLabel("Your name").fill(`Pilot ${Date.now()}`);
  await page.getByLabel("Room password").fill("crash-site");
  await page.getByRole("button", { name: "Create private session" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Passenger manifest · 1\/15 connected/i })).toBeVisible({ timeout: 15_000 });
});
