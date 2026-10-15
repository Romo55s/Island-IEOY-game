import { expect, test } from "@playwright/test";

test("renders the game shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Island of Extremely Questionable Judgment" }),
  ).toBeVisible();
});
