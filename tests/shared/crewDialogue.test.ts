import { describe, expect, it } from "vitest";
import { selectDecisionPromptDialogue, selectResolvedCrewDialogue, traceResolvedCrewDialogue } from "../../src/shared/content/crewDialogue";

const all = ["cast-daniel", "cast-samantha", "cast-jim-young", "cast-esther-morgan", "cast-tim", "cast-tony", "cast-michelle", "cast-jacob-ramirez", "cast-zach", "cast-jessica-adlock", "cast-jorge", "cast-maria", "cast-richard-wang", "cast-steve", "cast-walter"];

describe("resolved crew dialogue", () => {
  it("selects a reproducible role-aware exchange for a known resolved outcome", () => {
    const event = { id: "event-ABC234-3", outcomeId: "cover-secured", resolution: undefined };
    const first = selectResolvedCrewDialogue("ABC234", event, all);
    expect(first).toEqual(selectResolvedCrewDialogue("ABC234", event, [...all].reverse()));
    expect(first?.lines.length).toBeGreaterThanOrEqual(2);
    expect(first?.lines.length).toBeLessThanOrEqual(3);
    expect(first?.lines.map(({ characterId }) => characterId)).toContain("cast-tim");
    expect(first?.lines.some(({ text }) => /shelter|release|MVP/i.test(text))).toBe(true);
  });

  it("uses a safe contextual fallback for an outcome without authored banter", () => {
    const event = { id: "e1", outcomeId: "unknown-outcome", socialCue: "setback" as const };
    const first = selectResolvedCrewDialogue("ABC234", event, all);
    expect(first?.lines).toHaveLength(2);
    expect(first?.lines).toEqual(selectResolvedCrewDialogue("ABC234", event, [...all].reverse())?.lines);
    expect(first?.lines.every(({ text }) => text.length > 0 && text.length <= 160)).toBe(true);
  });

  it("falls back to a safe reply if a authored role is absent", () => {
    expect(selectResolvedCrewDialogue("ABC234", { id: "e1", outcomeId: "cover-secured" }, ["cast-daniel", "cast-jim-young"])?.templateId).toBe("contextual-fallback-v1");
  });

  it("supports a lone survivor with a short factual response", () => {
    expect(selectResolvedCrewDialogue("ABC234", { id: "e1", outcomeId: "unknown-outcome" }, ["cast-jacob-ramirez"])?.lines).toHaveLength(1);
  });

  it("uses a serious exchange when the event records a death", () => {
    const exchange = selectResolvedCrewDialogue("ABC234", { id: "e-death", outcomeId: "radio-repaired", deathCharacterIds: ["cast-tony"] }, all);
    expect(exchange?.templateId).toBe("loss-support-v1");
    expect(exchange?.lines.every(({ emotion, animation, text }) => emotion === "sad" && animation === "sad" && !/MVP|Drupal|sprint|backlog/i.test(text))).toBe(true);
  });

  it("does not mistake daily starvation health loss for a fresh injury", () => {
    const event = { id: "e-starvation", outcomeId: "unknown-outcome", socialCue: "danger" as const, resolution: { decisionId: "d", prompt: "p", winningOptionId: "o", winningOptionLabel: "l", outcomeId: "unknown-outcome", outcomeText: "t", optionResults: [], resourceChanges: [{ scope: "character" as const, characterId: "cast-daniel", resource: "health" as const, before: 20, after: 8, delta: -12, cause: "starvation" as const }], statusChanges: [], affectedCharacterIds: [], presentationCue: "danger" as const } };
    expect(traceResolvedCrewDialogue("ABC234", event, all).publicFacts.freshInjury).toBe(false);
  });

  it("opens only context-safe authored dialogue before a result exists", () => {
    const first = selectDecisionPromptDialogue("ABC234", "campaign-shelter-reinforcement", all);
    expect(first?.lines).toHaveLength(2);
    expect(first?.lines.map(({ characterId }) => characterId)).toContain("cast-jorge");
    expect(first).toEqual(selectDecisionPromptDialogue("ABC234", "campaign-shelter-reinforcement", [...all].reverse()));
  });

  it("keeps a rain catch distinct from finding and marking a spring", () => {
    const spring = selectResolvedCrewDialogue("ABC234", { id: "spring", outcomeId: "spring-found" }, all);
    const rain = selectResolvedCrewDialogue("ABC234", { id: "rain", outcomeId: "leaf-catch" }, all);
    expect(spring?.templateId).toBe("spring-found-esther-eagle-eye-v1");
    expect(rain?.templateId).toBe("rain-catch-water-v1");
    expect(rain?.lines.some(({ text }) => /spring|mark the route/i.test(text))).toBe(false);
  });

  it("includes the requested Product Owner and Scrum Master pairings when present", () => {
    const repair = selectResolvedCrewDialogue("ABC234", { id: "repair-team", outcomeId: "radio-repair-failed" }, all);
    expect(repair?.lines.map(({ characterId }) => characterId)).toEqual(["cast-michelle", "cast-jessica-adlock"]);
    const council = selectResolvedCrewDialogue("ABC234", { id: "council-team", outcomeId: "shared-work" }, all);
    expect(council?.lines.map(({ characterId }) => characterId)).toEqual(["cast-jorge", "cast-maria"]);
  });

  it("describes a raised platform without overstating that the shelter is finished", () => {
    const exchange = selectResolvedCrewDialogue("ABC234", { id: "platform", outcomeId: "raised-sleeping-area" }, all);
    expect(exchange?.templateId).toBe("sleeping-platform-raised-v1");
    expect(exchange?.lines.map(({ text }) => text).join(" ")).not.toMatch(/shelter is ready|shelter is done/i);
  });

  it("explains safe fallback eligibility for the authoring preview", () => {
    const trace = traceResolvedCrewDialogue("ABC234", { id: "e-unknown", outcomeId: "unknown-outcome", socialCue: "setback" }, all);
    expect(trace.selectedTemplateId).toBe("contextual-fallback-v1");
    expect(trace.rejectedReasons).toContain("No exact-outcome exchange is authored; a context-safe fallback is used.");
  });

  it("suppresses a repeated template during the recent-exchange cooldown", () => {
    const event = { id: "shelter-next", outcomeId: "cover-secured" };
    const previous = { id: "old", templateId: "shelter-ready-product-scope-v1", motifIds: ["product-scope"], lines: [] };
    expect(selectResolvedCrewDialogue("ABC234", event, all, [previous])?.templateId).toBe("contextual-fallback-v1");
  });

  it("suppresses a repeated workplace motif in a personalized fallback", () => {
    const prior = { id: "old-debug", templateId: "older-debug-line", motifIds: ["drupal-debug"], lines: [{ characterId: "cast-daniel", text: "previous", emotion: "neutral" as const, animation: "agree" as const }] };
    const exchange = selectResolvedCrewDialogue("ABC234", { id: "new-debug", outcomeId: "unmapped", socialCue: "setback" }, ["cast-daniel"], [prior]);
    expect(exchange?.lines[0]?.text).not.toMatch(/Drupal|regression|configuration/i);
    expect(exchange?.motifIds ?? []).not.toContain("drupal-debug");
  });

  it("does not let a hidden private chooser affect the public exchange", () => {
    const publicEvent = { id: "fuel-choice-1", socialCue: "neutral" as const };
    const keptEvent = Object.assign({}, publicEvent, { actorCharacterId: "cast-daniel", privateChoice: "keep" });
    const shareEvent = Object.assign({}, publicEvent, { actorCharacterId: "cast-walter", privateChoice: "share" });
    const kept = selectResolvedCrewDialogue("ABC234", keptEvent, all);
    const share = selectResolvedCrewDialogue("ABC234", shareEvent, [...all].reverse());
    expect(kept).toEqual(share);
    expect(JSON.stringify(kept)).not.toMatch(/privateChoice|keep|share/);
  });

  it("prioritizes a fresh casualty over injury and positive resource changes", () => {
    const event = { id: "mixed-fatal", outcomeId: "foraging-success", socialCue: "success" as const, deathCharacterIds: ["cast-tony"], resolution: {
      decisionId: "forage", prompt: "Forage?", winningOptionId: "search", winningOptionLabel: "Search", outcomeId: "foraging-success", outcomeText: "Food found, but a crew member dies.",
      optionResults: [], resourceChanges: [
        { scope: "character" as const, characterId: "cast-tony", resource: "health" as const, before: 10, after: 0, delta: -10, cause: "outcome" as const },
        { scope: "character" as const, characterId: "cast-zach", resource: "food" as const, before: 0, after: 10, delta: 10, cause: "outcome" as const },
      ], statusChanges: [{ characterId: "cast-tony", before: "alive" as const, after: "ghost" as const, cause: "outcome" as const }], affectedCharacterIds: ["cast-tony"], presentationCue: "success" as const,
    } };
    const exchange = selectResolvedCrewDialogue("ABC234", event, all);
    expect(exchange?.templateId).toBe("loss-support-v1");
    expect(exchange?.lines.every(({ emotion, text }) => emotion === "sad" && !/food acquired|lunch|backlog/i.test(text))).toBe(true);
  });
});
