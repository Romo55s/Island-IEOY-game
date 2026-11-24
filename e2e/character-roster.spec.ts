import { expect, test } from "@playwright/test";

test("decision bench shows the correctly named 3D cast and a death produces mixed grief responses", async ({ page }) => {
  test.setTimeout(60_000);
  const modelResponses: Array<{ path: string; status: number }> = [];
  const pageErrors: string[] = [];
  page.on("response", (response) => {
    if (/\/models\/characters\/[^/]+\.glb(?:\?|$)/.test(response.url())) {
      modelResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/decision-test");
  await expect(page.getByRole("heading", { name: "Decision test bench" })).toBeVisible();
  await expect(page.getByLabel("3D portraits")).toBeChecked();
  await page.getByLabel("Test crew size").selectOption("8");
  await expect(page.locator("canvas")).toHaveCount(1);

  for (const name of ["Daniel", "Samantha", "Jim Young", "Esther Morgan", "Tim", "Michelle", "Jacob Ramirez", "Zach"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect.poll(() => modelResponses.filter(({ status }) => status === 200).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(8);
  await page.screenshot({ path: "output/qa/character-roster-core.png" });

  const radio = page.locator('[aria-live="polite"][aria-relevant="additions text"]');
  const radioPortrait = radio.locator('[data-model-portrait="true"]').first();
  await expect(radioPortrait).toHaveAttribute("data-model-visible", "true");
  const portraitBeforeScroll = await radioPortrait.boundingBox();
  await radio.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(async () => (await radioPortrait.boundingBox())?.y).not.toBe(portraitBeforeScroll?.y);
  await expect(radioPortrait).toHaveAttribute("data-model-visible", "false");
  await page.screenshot({ path: "output/qa/character-portrait-radio-scroll.png" });

  await page.getByLabel("Character render group").selectOption("additional");
  await page.getByLabel("Test crew size").selectOption("6");
  await expect(page.locator("canvas")).toHaveCount(1);
  for (const name of ["Jessica Adlock", "Jorge", "Maria", "Richard Wang", "Steve", "Walter"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect.poll(() => modelResponses.filter(({ status }) => status === 200).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(14);
  await page.screenshot({ path: "output/qa/character-roster-additional.png" });

  await expect(page.getByLabel("Test crew size").locator("option")).toContainText("16 survivors");
  await page.getByLabel("Test crew size").selectOption("16");
  await expect(page.getByLabel("Character render group")).toHaveValue("full");
  for (const name of ["Daniel", "Tony", "Walter", "Jessica Adlock", "Zach", "Steve"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await page.screenshot({ path: "output/qa/character-roster-full-16.png" });

  await page.getByRole("button", { name: "Model gallery" }).click();
  const gallery = page.getByRole("dialog", { name: "Character renders & profiles" });
  await expect(gallery).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
  for (const name of ["Daniel", "Samantha", "Jim Young", "Esther Morgan", "Tim", "Tony", "Michelle", "Jacob Ramirez", "Zach", "Jessica Adlock", "Jorge", "Maria", "Richard Wang", "Steve", "Walter", "Courtney"]) {
    await gallery.getByRole("button", { name, exact: true }).click();
    await expect(gallery.getByRole("heading", { level: 3 })).toHaveText(name);
  }
  await gallery.getByRole("button", { name: "Cheer", exact: true }).click();
  await page.screenshot({ path: "output/qa/character-render-preview.png" });
  await gallery.getByRole("button", { name: "Close" }).click();

  await page.getByLabel("Story decision").selectOption({ label: "The wreckage is shifting. You can save exactly one extremely important thing." });
  await page.getByRole("button", { name: "Pocket the lighter" }).click();
  const outcomeSelect = page.getByLabel("Outcome to preview");
  const deathOutcome = outcomeSelect.locator("option").filter({ hasText: "sleeve catches fire" });
  await outcomeSelect.selectOption(await deathOutcome.getAttribute("value") ?? "");
  await page.getByRole("button", { name: "Resolve preview" }).click();

  await expect(page.getByRole("heading", { name: /The crew chose/i })).toBeVisible();
  await expect(page.locator('[data-emotion="sad"]').first()).toBeVisible();
  await expect(page.locator("[data-emotion]").first()).toHaveAttribute("data-emotion", /^(neutral|happy|sad|afraid|angry|relieved)$/);
  await page.screenshot({ path: "output/qa/character-death-reactions.png" });
  expect(modelResponses.filter(({ status }) => status >= 400)).toEqual([]);
  expect(pageErrors).toEqual([]);
});
