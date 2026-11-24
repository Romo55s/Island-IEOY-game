import { expect, test, type Page } from "@playwright/test";

async function playingVoice(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const modulePath = performance.getEntriesByType("resource").map(entry => entry.name).find(url => new URL(url).pathname === "/src/audio/audioSystem.ts")!;
    return (await import(modulePath)).getPlayingVoice();
  });
}
async function openDialogue(page: Page) {
  await page.goto("/decision-test");
  await expect(page.getByRole("heading", { name:"Decision test bench" })).toBeVisible();
  await page.getByLabel("Test crew size").selectOption("16");
  await page.getByLabel("Story decision").selectOption("campaign-shelter-reinforcement");
}

test("recorded voices follow typed dialogue and stop when skipped", async ({page}) => {
  const errors: string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await openDialogue(page);
  const exchange=page.getByRole("article",{name:"Current crew exchange"});
  const speaking=exchange.locator('[data-speaking="true"]');
  await expect(speaking).toHaveCount(1);
  const characterId=await speaking.getAttribute("data-character-id");
  await expect.poll(()=>playingVoice(page)).toBe(characterId);
  const visible=speaking.locator("[data-visible-dialogue]");
  const firstText=await visible.innerText();
  await expect.poll(()=>visible.innerText()).not.toBe(firstText);
  await page.screenshot({path:"output/qa/character-voices/desktop-speaking.png",fullPage:true});
  await exchange.getByRole("button",{name:"Show full conversation"}).click();
  await expect(exchange.locator('[data-speaking="true"]')).toHaveCount(0);
  await expect.poll(()=>playingVoice(page)).toBeNull();
  await expect(exchange.locator("[data-visible-dialogue]").first()).toContainText("Before we build");
  await expect(exchange.locator("[data-visible-dialogue]").last()).toContainText("Scope suggestion");
  expect(errors).toEqual([]);
});

test("mobile radio remains readable with reduced motion and voice volume",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:"reduce"});
  await openDialogue(page);
  await page.getByRole("button",{name:/^Radio ·/}).click();
  const exchange=page.getByRole("article",{name:"Current crew exchange"});
  await expect(exchange.locator("[data-visible-dialogue]").first()).toContainText("Before we build");
  await expect(exchange.locator("[data-visible-dialogue]").last()).toContainText("Scope suggestion");
  await page.waitForLoadState("networkidle");
  await expect(exchange.locator('[data-model-visible="true"]')).toHaveCount(2);
  await page.screenshot({path:"output/qa/character-voices/mobile-radio.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goto("/sound-test");
  await page.getByRole("button",{name:"Play Courtney's voice",exact:true}).click();
  await expect.poll(()=>playingVoice(page)).toBe("cast-courtney");
  await page.getByLabel("Voices volume").fill("0");
  await expect(page.getByLabel("Voices volume")).toHaveValue("0");
  await page.getByRole("button",{name:"Stop Courtney's voice",exact:true}).click();
  await expect.poll(()=>playingVoice(page)).toBeNull();
});

test("unavailable voice files leave usable dialogue",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/audio/voices/*.mp3",route=>route.abort());
  await openDialogue(page);
  const exchange=page.getByRole("article",{name:"Current crew exchange"});
  await exchange.getByRole("button",{name:"Show full conversation"}).click();
  await expect(exchange.locator("[data-visible-dialogue]").last()).toContainText("Scope suggestion");
  await expect.poll(()=>playingVoice(page)).toBeNull();
  expect(errors).toEqual([]);
});
