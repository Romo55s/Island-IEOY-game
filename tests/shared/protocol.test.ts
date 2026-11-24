import { describe, expect, it } from "vitest";
import type { CrewDialogueExchange, EventEntry, PrivateRoomState } from "../../src/shared/domain";
import { ApiErrorResponseSchema, ClientCommandSchema, CreateSessionRequestSchema, PublicGameSnapshotSchema, TicketRequestSchema, toPublicSnapshot } from "../../src/shared/protocol";

const validVote = { protocolVersion: 7, commandId: "command-1", type: "vote.submit", payload: { optionId: "option-1" } } as const;
const privateState: PrivateRoomState = {
  code: "ABC234", revision: 1, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_ana", phaseStartedAt: 0,
  phaseDeadlineAt: 30_000, votingOpensAt: 10_000, earliestResolveAt: 20_000, phaseEndsAt: 30_000,
  players: { p_ana: { id: "p_ana", displayName: "Ana", status: "alive", characterId: null, ready: true, connected: true, joinedAt: 0 } },
  characters: {}, resources: { shelter: 50 },
  deck: [{ id: "card-1", prompt: "Choose.", options: [{ id: "option-1", label: "Do it", outcomes: [] }, { id: "option-2", label: "Do not", outcomes: [] }] }],
  decisionIndex: 0, currentDecisionId: "card-1", votesByPlayer: { p_ana: "option-1" }, eligibleVoterIds: ["p_ana"], eventHistory: [],
};

describe("shared protocol", () => {
  it("validates versioned vote commands", () => {
    expect(ClientCommandSchema.safeParse(validVote).success).toBe(true);
    expect(ClientCommandSchema.safeParse({ ...validVote, protocolVersion: 1 }).success).toBe(false);
    expect(ClientCommandSchema.safeParse({ ...validVote, payload: { optionId: "" } }).success).toBe(false);
  });
  it("validates private crash-choice commands", () => {
    expect(ClientCommandSchema.safeParse({ protocolVersion: 7, commandId: "item-1", type: "crash.item.submit", payload: { itemId: "lighter" } }).success).toBe(true);
    expect(ClientCommandSchema.safeParse({ protocolVersion: 7, commandId: "rescue-1", type: "crash.rescue.submit", payload: { targetCharacterId: "cast-daniel" } }).success).toBe(true);
    expect(ClientCommandSchema.safeParse({ protocolVersion: 7, commandId: "item-2", type: "crash.item.submit", payload: { itemId: "lighter", targetCharacterId: "cast-daniel" } }).success).toBe(false);
  });
  it("validates assigned votes, assignment responses, and viewer-private response controls", () => {
    expect(ClientCommandSchema.safeParse({ ...validVote, payload: { optionId: "option-1", assignedCharacterId: "cast-daniel" } }).success).toBe(true);
    expect(ClientCommandSchema.safeParse({ protocolVersion: 7, commandId: "respond-1", type: "assignment.respond", payload: { assignmentId: "assignment-1", response: "try-refuse" } }).success).toBe(true);
    const assignedState: PrivateRoomState = {
      ...privateState,
      phase: "assignmentResponse",
      players: { p_ana: { ...privateState.players.p_ana!, characterId: "cast-daniel" } },
      characters: { "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 100, morale: 50, water: 50 }, startingItemId: "rope" } },
      deck: [{ id: "card-1", prompt: "Choose.", options: [{ id: "option-1", label: "Do it", outcomes: [], assignment: { roleLabel: "enter the cave", actorSelection: "group-nominated-living", refusal: { successChanceBps: 3_500, qualitativeRisk: "risky", successOutcomes: [{ id: "sealed", text: "Sealed.", weight: 1 }] } } }, { id: "option-2", label: "Do not", outcomes: [] }] }],
      resolvedOptionCounts: { "option-1": 1, "option-2": 0 }, winningOptionId: "option-1",
      pendingAssignment: { id: "assignment-1", decisionId: "card-1", optionId: "option-1", actorCharacterId: "cast-daniel", actorPlayerId: "p_ana", roleLabel: "enter the cave", selectionMethod: "group-nomination", createdAt: 1, deadlineAt: 15_001, response: null },
    };
    const actor = toPublicSnapshot(assignedState, "p_ana");
    expect(actor.activeAssignment).toMatchObject({ id: "assignment-1", actorCharacterId: "cast-daniel" });
    expect(actor.viewerAssignment).toEqual({ canRespond: true, qualitativeRisk: "risky" });
    expect(JSON.stringify(actor)).not.toContain("successChanceBps");
    expect(JSON.stringify(actor)).not.toContain('"response"');
    expect(actor.characters[0]?.startingItemId).toBe("rope");
    expect(PublicGameSnapshotSchema.safeParse(actor).success).toBe(true);
    expect(PublicGameSnapshotSchema.safeParse({ ...actor, successChanceBps: 3_500 }).success).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({
      ...actor,
      players: actor.players.map((player) => player.id === actor.viewer.playerId ? { ...player, characterId: null } : player),
    }).success).toBe(false);
  });
  it("validates v4 private-choice commands and ending invariants",()=>{
    expect(ClientCommandSchema.safeParse({protocolVersion:7,commandId:"private-1",type:"private-choice.respond",payload:{choiceId:"fuel-1",optionId:"transfer",targetCharacterId:"cast-samantha"}}).success).toBe(true);
    expect(ClientCommandSchema.safeParse({protocolVersion:7,commandId:"private-2",type:"private-choice.respond",payload:{choiceId:"fuel-1",optionId:"invented"}}).success).toBe(false);
    const ending={...toPublicSnapshot(privateState,"p_ana"),phase:"ending" as const,phaseDeadlineAt:null,phaseEndsAt:null,endingId:"solo-escape" as const,escapeResult:{type:"solo-escape" as const,escapedCharacterIds:[],strandedCharacterIds:[],deadCharacterIds:[],cause:"solo-launch" as const,epilogueId:"motorboat-selfish-aftermath-v1" as const}};
    expect(PublicGameSnapshotSchema.safeParse(ending).success).toBe(false);
  });
  it("exposes active group ballots but keeps private state and credentials out of snapshots", () => {
    const snapshot = toPublicSnapshot(privateState, "p_ana");
    expect(snapshot.viewer.hasVoted).toBe(true);
    expect(snapshot.liveVotes).toEqual([{ playerId: "p_ana", optionId: "option-1" }]);
    expect("resolvedOptionCounts" in snapshot).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, passwordHash: "secret" }).success).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, votesByPlayer: { p_ana: "option-1" } }).success).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, endingId: "alive-technically" }).success).toBe(false);
  });
  it("validates public death IDs for one-shot death presentation", () => {
    const snapshot = toPublicSnapshot({ ...privateState, eventHistory: [{ id: "decision-1", text: "Starvation claims Ana.", createdAt: 1, decisionId: "coconut-jury", winningOptionId: "shake-palm", outcomeId: "coconut-falls", socialCue: "danger", deathCharacterIds: ["cast-daniel"] }] }, "p_ana");
    expect(snapshot.eventHistory[0]).toMatchObject({ decisionId: "coconut-jury", winningOptionId: "shake-palm", outcomeId: "coconut-falls", socialCue: "danger" });
    expect(PublicGameSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, eventHistory: [{ ...snapshot.eventHistory[0], deathCharacterIds: Array(16).fill("cast-daniel") }] }).success).toBe(false);
  });
  it("accepts bounded persisted dialogue metadata and rejects duplicate speakers", () => {
    const exchange: CrewDialogueExchange = { id: "event-dialogue-1", templateId: "repair-failed-debug-v1", motifIds: ["drupal-debug"], lines: [{ characterId: "cast-daniel", text: "Let's inspect the fault.", emotion: "neutral", animation: "agree" }, { characterId: "cast-jim-young", text: "No error log? A Drupal classic.", emotion: "neutral", animation: "laugh" }] };
    const event: EventEntry = { id: "dialogue-event", text: "The engine is still broken.", createdAt: 1, outcomeId: "radio-repair-failed", socialCue: "setback", crewDialogue: exchange };
    expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot({ ...privateState, eventHistory: [event] }, "p_ana")).success).toBe(true);
    const duplicate: EventEntry = { ...event, crewDialogue: { ...exchange, lines: [exchange.lines[0]!, { ...exchange.lines[1]!, characterId: "cast-daniel" }] } };
    expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot({ ...privateState, eventHistory: [duplicate] }, "p_ana")).success).toBe(false);
  });
  it("validates coherent structured decision facts without exposing voter identities", () => {
    const resolution = {
      decisionId: "coconut-jury", prompt: "Shake it?", winningOptionId: "shake-palm", winningOptionLabel: "Shake the palm",
      outcomeId: "coconut-falls", outcomeText: "The coconut files a complaint.",
      optionResults: [{ optionId: "shake-palm", label: "Shake the palm", votes: 1 }, { optionId: "wait", label: "Wait", votes: 0 }],
      resourceChanges: [{ scope: "character" as const, characterId: "cast-daniel", resource: "health" as const, before: 50, after: 40, delta: -10, cause: "outcome" as const }],
      statusChanges: [], affectedCharacterIds: ["cast-daniel"], presentationCue: "danger" as const,
    };
    const event = { id: "decision-1", text: "The coconut wins.", createdAt: 1, decisionId: "coconut-jury", winningOptionId: "shake-palm", outcomeId: "coconut-falls", socialCue: "danger" as const, resolution };
    const snapshot = toPublicSnapshot({ ...privateState, eventHistory: [event] }, "p_ana");
    expect(PublicGameSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(JSON.stringify(snapshot.eventHistory)).not.toContain("p_ana");
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, eventHistory: [{ ...event, resolution: { ...resolution, resourceChanges: [{ ...resolution.resourceChanges[0], delta: -11 }] } }] }).success).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, eventHistory: [{ ...event, winningOptionId: "wait" }] }).success).toBe(false);
  });
  it("sends only the viewer's item offer and hides pending choices", () => {
    const state: PrivateRoomState = {
      ...privateState,
      phase: "crashItemChoice",
      crashItemOffersByPlayer: { p_ana: ["lighter", "rope", "apple"], p_bo: ["knife", "flare", "guitar"] },
      crashItemsByPlayer: { p_bo: "flare" },
      rescueTargetsByPlayer: { p_bo: "cast-daniel" },
    };
    const snapshot = toPublicSnapshot(state, "p_ana");
    expect(snapshot.crashItemOffer).toEqual(["lighter", "rope", "apple"]);
    expect(snapshot.viewerCrashChoices).toEqual({ hasSelectedItem: false, hasSelectedRescueTarget: false });
    expect(JSON.stringify(snapshot)).not.toContain("knife");
    expect(snapshot).not.toHaveProperty("rescueTargetsByPlayer");
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, crashItemOffer: ["lighter", "lighter", "apple"] }).success).toBe(false);
  });
  it("validates shared HTTP contracts", () => {
    expect(CreateSessionRequestSchema.safeParse({ displayName: "Ana", password: "isla" }).success).toBe(true);
    expect(TicketRequestSchema.safeParse({ mode: "resume", resumeToken: "x".repeat(43) }).success).toBe(true);
    expect(ApiErrorResponseSchema.safeParse({ error: { code: "INVALID_PASSWORD", message: "No match" } }).success).toBe(true);
  });
});
