import { expect, test, type Locator, type Page } from "@playwright/test";

const characterNames = {
  groupEscaped: "Daniel, Samantha, Jim Young, Esther Morgan, Tim, Tony, Michelle",
  soloStranded: "Samantha, Jim Young, Esther Morgan, Tim, Tony, Michelle",
  dead: "Jacob Ramirez",
};

async function fate(page: Page, label: "Escaped" | "Stranded" | "Dead"): Promise<Locator> {
  return page.locator("dl div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
}

test.describe("successful motorboat endings", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the factual group escape aftermath", async ({ page }) => {
    await page.goto("/e2e/fixtures/motorboat-ending.html?ending=group-escape");

    const title = page.getByRole("heading", { name: "They actually escaped together" });
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(await fate(page, "Escaped")).toHaveText(characterNames.groupEscaped);
    await expect(await fate(page, "Stranded")).toHaveText("None");
    await expect(await fate(page, "Dead")).toHaveText(characterNames.dead);
    await expect(page.getByText(/survivors later described the voyage as coordinated/i)).toBeVisible();
    await expect(page.locator("section[aria-labelledby='ending-title']")).toHaveCSS("position", "fixed");

    await page.screenshot({ path: "output/playwright/motorboat-group-escape.png", fullPage: true });
  });

  test("shows the factual solo escape aftermath without duplicating its passenger", async ({ page }) => {
    await page.goto("/e2e/fixtures/motorboat-ending.html?ending=solo-escape");

    const title = page.getByRole("heading", { name: "One seat, zero shame" });
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(await fate(page, "Escaped")).toHaveText("Daniel");
    await expect(await fate(page, "Stranded")).toHaveText(characterNames.soloStranded);
    await expect(await fate(page, "Stranded")).not.toContainText("Daniel");
    await expect(await fate(page, "Dead")).toHaveText(characterNames.dead);
    await expect(page.getByText(/sole escapee sold the story as a lesson in decisive leadership/i)).toBeVisible();

    await page.screenshot({ path: "output/playwright/motorboat-solo-escape.png", fullPage: true });
  });
});
