import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`UI Lab ${viewport.name}`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-15T18:00:00Z") });
    await page.setViewportSize(viewport);
    await page.goto("/ui-lab");
    await expect(page.getByRole("heading", { name: "Black-box interface lab" })).toBeVisible();
    await expect(page).toHaveScreenshot(`ui-lab-${viewport.name}.png`, { fullPage: true, animations: "disabled" });
  });
}
