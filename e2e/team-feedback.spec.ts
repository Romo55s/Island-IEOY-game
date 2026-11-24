import { expect, test, type Page } from "@playwright/test";
import { CHARACTER_CATALOG } from "../src/shared/domain";

async function choose(page: Page, trigger: RegExp, character: RegExp, target=false) {
  await page.getByRole("button",{name:trigger}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByRole("button",{name:character}).click();
  await dialog.getByRole("button",{name:target?"Confirm target":"Confirm nominee"}).click();
}

test("bear hunt uses the real owner and returns a named death report", async ({page})=>{
  await page.goto("/team-feedback");
  await expect(page.getByRole("heading",{name:"Team feedback preview"})).toBeVisible();
  await expect(page.getByLabel("Crew dialogue")).toContainText("Tony, you've got a knife");
  await page.getByLabel("Outcome roll").selectOption("0.9");
  await choose(page,/Nominate survivor for Fight the bear/,/^Tony, played/);
  await page.getByRole("button",{name:/^4.*Fight the bear|^Fight the bear/}).click();
  await page.getByRole("button",{name:"Take the job"}).click();
  await expect(page.getByLabel("Crew status")).toContainText("Tony · ghost");
  await expect(page.getByText("The bear kills the assigned hunter.",{exact:false})).toBeVisible();
  await page.screenshot({path:"output/qa/team-feedback/bear-death.png",fullPage:true});
  await page.getByRole("button",{name:"Continue campaign"}).click();
  await expect(page.getByLabel("Preview phase")).toContainText("shelter-reinforcement");
});

test("group target vote shows the victim, actual rewards and next route",async({page})=>{
  await page.goto("/team-feedback");
  await page.getByLabel("Scenario").selectOption("group");
  await choose(page,/Choose target for Choose someone/,/^Tony, played/,true);
  await page.getByRole("button",{name:/^2.*Choose someone to eat|^Choose someone to eat/}).click();
  await expect(page.getByText("The crew chose to eat Tony.",{exact:false})).toBeVisible();
  await expect(page.getByLabel("Crew status")).toContainText("Jim Young · alive · Food 25");
  await expect(page.getByLabel("Crew status")).toContainText("Tony · ghost");
  await page.screenshot({path:"output/qa/team-feedback/group-result.png",fullPage:true});
  await page.getByRole("button",{name:"Continue campaign"}).click();
  await expect(page.getByLabel("Preview phase")).toContainText("crew-council");
});

test("night privacy, failure reveal, and mobile target selection",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/team-feedback");
  await page.getByLabel("Outcome roll").selectOption("0.5");
  await page.getByLabel("Scenario").selectOption("night");
  await page.getByLabel("View as another player").check();
  await expect(page.getByRole("button",{name:"Sleep",exact:true})).toHaveCount(0);
  await expect(page.getByText("Night falls over camp. Waiting for morning.")).toBeVisible();
  await page.getByLabel("View as another player").uncheck();
  await page.getByRole("button",{name:"Choose a living target"}).click();
  await page.getByRole("dialog").getByRole("button",{name:/^Tony, played/}).click();
  await page.screenshot({path:"output/qa/team-feedback/mobile-target.png",fullPage:true});
  await page.getByRole("button",{name:"Confirm target"}).click();
  await page.getByRole("button",{name:/Try to eat someone/}).click();
  await expect(page.getByRole("heading",{name:"What happened while camp slept"})).toBeVisible();
  await expect(page.getByText("Jim Young tried to eat Tony",{exact:false})).toBeVisible();
  await expect(page.getByLabel("Crew status")).toContainText("Jim Young · alive · Food 0 · Health 85");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:"output/qa/team-feedback/mobile-night-result.png",fullPage:true});
});

test("full roster and a declined private choice remain playable",async({page})=>{
  await page.goto("/team-feedback");
  await page.getByLabel("Crew size").selectOption(String(CHARACTER_CATALOG.length));
  await page.getByLabel("Scenario").selectOption("night");
  await expect(page.getByLabel("Crew status").getByRole("listitem")).toHaveCount(CHARACTER_CATALOG.length);
  await page.getByRole("button",{name:"Sleep",exact:true}).click();
  await expect(page.getByLabel("Preview phase")).toContainText("Phase: decision");
  await expect(page.getByLabel("Preview phase")).toContainText("crew-council");
});

test("keyboard target selection does not submit a vote while its dialog is open",async({page})=>{
  await page.goto("/team-feedback");
  await page.getByLabel("Scenario").selectOption("group");
  const trigger=page.getByRole("button",{name:/Choose target for Choose someone/});
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog=page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("1");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button",{name:/^Jim Young, played/})).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button",{name:/^Tony, played/})).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button",{name:"Confirm target"})).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("2");
  await expect(page.getByLabel("Crew status")).toContainText("Tony · ghost");
});
