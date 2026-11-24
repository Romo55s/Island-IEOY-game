import { describe, expect, it } from "vitest";
import { feedbackRoom } from "../fixtures/teamFeedback";
import { sequenceRandom } from "../../src/shared/rules/random";
import { beginNextCampaignStep, resolveCurrentDecision, resolvePendingAssignment, resolvePendingPrivateChoice, advancePhase } from "../../src/shared/rules/stateMachine";
import { resolveDesperation, pickAttemptOutcome } from "../../src/shared/desperation/resolve";
import { canOfferGroupCrisis, nightOfferChanceBps } from "../../src/shared/desperation/opportunities";
import { prepareDesperation } from "../../src/shared/desperation/coordinator";
import { createBearEncounterCard } from "../../src/shared/content/bearEncounter";
import { publicDialogueContext, selectInstigatorPrompt } from "../../src/shared/content/instigatorDialogue";
import { PublicGameSnapshotSchema, toPublicSnapshot } from "../../src/shared/protocol";
import { SURVIVAL_ITEMS } from "../../src/shared/content/items";
import { drawStartingItemOffer } from "../../src/shared/rules/itemOffers";
import { stormEnding } from "../../src/shared/rules/motorboat";
import { selectResolvedCrewDialogue } from "../../src/shared/content/crewDialogue";

describe("team feedback", () => {
  it("clears queued hunger work when a storm ends the session", () => {
    const room = feedbackRoom(); room.desperation!.nightCheckDue = true;
    room.desperation!.active = { id: "pending", kind: "group", day: 0 };
    const ended = stormEnding(room);
    expect(ended.desperation).toMatchObject({ nightCheckDue: false });
    expect(ended.desperation?.active).toBeUndefined();
    expect(prepareDesperation(ended, 1, sequenceRandom([]))).toBe(ended);
  });
  it("acknowledges a failed betrayal without claiming forgiveness or a reward", () => {
    const dialogue = selectResolvedCrewDialogue("ABC234", { id:"night-result", outcomeId:"night-regretted", socialCue:"setback" }, ["cast-jim-young", "cast-tony"]);
    expect(dialogue?.templateId).toBe("hunger-betrayal-reconsidered-v1");
    expect(dialogue?.lines.map(line => line.text).join(" ")).toContain("Nobody got food");
  });
  it.each(["try-signal", "try-motorboat"])("can finish %s after a hunger interrupt", (route) => {
    let state = beginNextCampaignStep(feedbackRoom(), 0, { next: () => 0 });
    for (let step = 0; step < 80 && state.phase !== "ending"; step++) {
      const now = state.phaseStartedAt ?? 0;
      if (state.phase === "decision") {
        const card = state.deck.find(c => c.id === state.currentDecisionId)!;
        const option = card.options.find(o => o.id === route) ?? card.options[0]!;
        state = resolveCurrentDecision({ ...state, votesByPlayer: Object.fromEntries(state.eligibleVoterIds.map(id => [id, option.id])) }, now + 1, { next: () => 0 });
      } else if (state.phase === "assignmentResponse") {
        state = resolvePendingAssignment({ ...state, pendingAssignment: { ...state.pendingAssignment!, response: "accept" } }, now + 1, { next: () => 0 });
      } else if (state.phase === "privateChoice") {
        state = resolvePendingPrivateChoice({ ...state, pendingPrivateChoice: { ...state.pendingPrivateChoice!, response: { optionId: state.pendingPrivateChoice!.defaultOptionId } } }, now + 1, { next: () => 0 });
      } else state = advancePhase(state, state.phaseDeadlineAt!, { next: () => 0 });
      expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot(state, "p_0")).success).toBe(true);
    }
    expect(state.phase).toBe("ending");
    expect(state.endingId).toBe(route === "try-signal" ? "signal-rescue" : "group-escape");
    expect(state.pendingPrivateChoice).toBeUndefined();
    expect(state.desperation?.active).toBeUndefined();
  });
  it("cancels a stale nominated victim rather than picking another person", () => {
    const room = beginNextCampaignStep(feedbackRoom(), 0, sequenceRandom([]));
    room.votesByPlayer = { p_0: "attempt" }; room.targetNominationsByPlayer = { p_0: "cast-tony" };
    room.characters["cast-tony"]!.status = "ghost"; room.characters["cast-tony"]!.resources.health = 0; room.players.p_1!.status = "ghost";
    const result = resolveCurrentDecision(room, 1, sequenceRandom([]));
    expect(result.eventHistory.at(-1)?.outcomeId).toBe("attempt-cancelled");
    expect(result.characters).toEqual(room.characters);
  });
  it("does not reroll a failed nightly offer at the same boundary", () => {
    const room = feedbackRoom(); room.desperation!.groupOfferCount = 2; room.desperation!.nightCheckDue = true;
    const checked = prepareDesperation(room, 0, sequenceRandom([0.99]));
    expect(checked.pendingPrivateChoice).toBeUndefined();
    expect(prepareDesperation(checked, 1, sequenceRandom([]))).toEqual(checked);
  });
  it("offers all eight new items through the same distinct random offer pool", () => {
    expect(SURVIVAL_ITEMS).toHaveLength(25);
    for (const id of ["popcorn-basket","polo-shirt","golf-club","rubber-duck","frying-pan","office-stapler","beach-umbrella","novelty-mug"]) expect(SURVIVAL_ITEMS.find(i => i.id === id)?.assetKey).toBeNull();
    const offer = drawStartingItemOffer(SURVIVAL_ITEMS, { next: () => 0.999 });
    expect(new Set(offer.map(i => i.id)).size).toBe(3);
    expect(offer.some(i => i.id === "novelty-mug")).toBe(true);
  });
  it("only lets Jim egg on the real living Tony with his real tool", () => {
    const room = feedbackRoom(50), context = publicDialogueContext(room, "campaign-bear-encounter");
    const exchange = selectInstigatorPrompt(room.code, "campaign-bear-encounter", context)!;
    expect(exchange.templateId).toBe("jim-tony-knife");
    expect(selectInstigatorPrompt(room.code, "campaign-bear-encounter", { ...context, livingCharacterIds: ["cast-tony"] })).toBeUndefined();
    expect(selectInstigatorPrompt(room.code, "campaign-bear-encounter", { ...context, itemIdsByCharacterId: {} })).toBeUndefined();
    expect(selectInstigatorPrompt(room.code, "campaign-bear-encounter", context, [exchange])).toBeUndefined();
  });
  it("persists the opening-dialogue cooldown across room reloads", () => {
    const room = feedbackRoom(50); room.campaign!.node = "bear-encounter";
    const opened = beginNextCampaignStep(room, 0, sequenceRandom([]));
    expect(opened.activeCrewDialogue?.templateId).toBe("jim-tony-knife");
    const loaded = structuredClone(opened); loaded.phase = "reveal";
    expect(beginNextCampaignStep(loaded, 1, sequenceRandom([])).activeCrewDialogue?.templateId).not.toBe("jim-tony-knife");
  });
  it("restricts bear approaches to actual tools and assigns only their owner", () => {
    const room = feedbackRoom(50); room.campaign!.node = "bear-encounter";
    const card = createBearEncounterCard(room);
    expect(card.options.map(o => o.id)).toEqual(["retreat","distract","hunt-knife"]);
    const begun = beginNextCampaignStep(room, 0, sequenceRandom([]));
    expect(toPublicSnapshot(begun, "p_0").currentDecision?.options.find(o => o.id === "hunt-knife")?.assignment?.eligibleCharacterIds).toEqual(["cast-tony"]);
    begun.votesByPlayer = { p_0: "hunt-knife" };
    begun.assignmentNominationsByPlayer = { p_0: "cast-jim-young" };
    const assigned = resolveCurrentDecision(begun, 1, sequenceRandom([0]));
    expect(assigned.pendingAssignment?.actorCharacterId).toBe("cast-tony");
    assigned.pendingAssignment!.response = "accept";
    const resolved = resolvePendingAssignment(assigned, 2, sequenceRandom([0.99]));
    expect(resolved.characters["cast-tony"]?.status).toBe("ghost");
    expect(resolved.characters["cast-jim-young"]?.status).toBe("alive");
    expect(resolved.campaign?.node).toBe("shelter-reinforcement");
    expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot(resolved, "p_0")).success).toBe(true);
  });
  it("allows bear refusal regardless of boat shelter constraints", () => {
    const room = feedbackRoom(50); room.campaign!.node = "bear-encounter"; room.resources.shelter = 0;
    const begun = beginNextCampaignStep(room, 0, sequenceRandom([])); begun.votesByPlayer = { p_0: "hunt-knife" }; begun.assignmentNominationsByPlayer = { p_0: "cast-tony" };
    const assigned = resolveCurrentDecision(begun, 1, sequenceRandom([])); assigned.pendingAssignment!.response = "try-refuse";
    const result = resolvePendingAssignment(assigned, 2, sequenceRandom([0,0]));
    expect(result.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("refusal-succeeded");
    expect(result.characters["cast-tony"]?.resources.health).toBe(100);
  });
  it("gates opportunities by hunger, location, and remaining people", () => {
    expect(canOfferGroupCrisis(feedbackRoom())).toBe(true);
    expect(canOfferGroupCrisis(feedbackRoom(50))).toBe(false);
    const room = feedbackRoom(); room.campaign!.node = "coastal-expedition";
    expect(canOfferGroupCrisis(room)).toBe(false);
    expect([nightOfferChanceBps(0,4),nightOfferChanceBps(1,4),nightOfferChanceBps(2,4),nightOfferChanceBps(4,4),nightOfferChanceBps(1,1)]).toEqual([0,3500,6500,8500,0]);
  });
  it.each([["group",0.4499,"group-succeeded"],["group",0.45,"target-fought-free"],["group",0.8,"group-backed-down"],["night",0.1999,"night-succeeded"],["night",0.2,"night-caught"],["night",0.7,"night-regretted"]] as const)("resolves %s probability boundary %s", (kind,roll,outcome) => {
    expect(pickAttemptOutcome(kind,sequenceRandom([roll]))).toBe(outcome);
  });
  it("keeps a resisting target alive and uses actual clamped deltas", () => {
    const room = feedbackRoom(); room.characters["cast-tony"]!.resources.health = 1;
    const result = resolveDesperation(room, { opportunityId:"x", kind:"group", action:"attempt", targetCharacterId:"cast-tony" },sequenceRandom([0.5]));
    expect(result.state.characters["cast-tony"]?.resources.health).toBe(1);
    expect(result.statusChanges).toEqual([]);
    expect(result.resourceChanges.filter(c => c.resource === "health")).toEqual([]);
  });
  it("feeds only the night actor and makes a dead victim a voting ghost", () => {
    const room = feedbackRoom(); room.characters["cast-jim-young"]!.resources.food=95;
    const result = resolveDesperation(room, { opportunityId:"x",kind:"night",action:"attempt",actorCharacterId:"cast-jim-young",targetCharacterId:"cast-tony" },sequenceRandom([0]));
    expect(result.state.players.p_1?.status).toBe("ghost");
    expect(result.state.eligibleVoterIds).toContain("p_1");
    expect(result.state.characters["cast-jim-young"]?.resources.food).toBe(100);
    expect(result.state.characters["cast-courtney"]?.resources.food).toBe(0);
    expect(result.resourceChanges.find(c => c.resource === "food")?.delta).toBe(5);
  });
  it("records fatal knockouts and never retargets an invalid private victim", () => {
    const room = feedbackRoom(); room.characters["cast-jim-young"]!.resources.health=10;
    const request = { opportunityId:"x",kind:"night" as const,action:"attempt" as const,actorCharacterId:"cast-jim-young",targetCharacterId:"cast-tony" };
    const result = resolveDesperation(room,request,sequenceRandom([0.4]));
    expect(result.state.players.p_0?.status).toBe("ghost"); expect(result.text).toContain("died from the injury");
    expect(resolveDesperation(room,{...request,targetCharacterId:"missing"},sequenceRandom([])).facts.outcomeId).toBe("attempt-cancelled");
  });
  it("resumes the same campaign node without advancing food ticks and resolves only once", () => {
    const room = feedbackRoom(); room.campaign!.decisionsSinceFoodTick=2;
    const begun = beginNextCampaignStep(room,0,sequenceRandom([])); expect(begun.currentDecisionId).toBe("camp-hunger-crisis");
    begun.votesByPlayer={p_0:"attempt",p_1:"attempt"}; begun.targetNominationsByPlayer={p_0:"cast-tony",p_1:"cast-tony"};
    const result = resolveCurrentDecision(begun,1,sequenceRandom([0]));
    expect(result.campaign?.node).toBe("crew-council"); expect(result.campaign?.decisionsSinceFoodTick).toBe(2);
    expect(result.characters["cast-jim-young"]?.resources.food).toBe(25);
    expect(resolveCurrentDecision(result,2,sequenceRandom([]))).toBe(result);
    const next=advancePhase(result,result.phaseDeadlineAt!,sequenceRandom([]));
    expect(next.currentDecisionId).toBe("campaign-crew-council");
    expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot(result,"p_1")).success).toBe(true);
  });
  it("keeps night actor/target private until an attempt and defaults to sleep", () => {
    const room=feedbackRoom(); room.desperation!.groupOfferCount=2; room.desperation!.nightCheckDue=true;
    const night=prepareDesperation(room,0,sequenceRandom([0,0.4]));
    const actor=toPublicSnapshot(night,"p_0"), other=toPublicSnapshot(night,"p_1");
    expect(actor.viewerPrivateChoice?.targetCharacterIds).toEqual(["cast-courtney","cast-tony"]);
    expect(other.viewerPrivateChoice).toBeUndefined(); expect(other.activePrivateChoice?.publicActorCharacterId).toBeUndefined();
    expect(PublicGameSnapshotSchema.safeParse(actor).success).toBe(true);
    expect(PublicGameSnapshotSchema.safeParse(other).success).toBe(true);
    const after=resolvePendingPrivateChoice(night,15000,sequenceRandom([]));
    expect(after.phase).toBe("decision"); expect(after.eventHistory).toHaveLength(0);
    expect(after.characters).toEqual(room.characters);
  });
});
