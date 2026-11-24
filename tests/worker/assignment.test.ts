import { env } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER_RESOURCES, PROTOCOL_VERSION, type DecisionCard, type Player } from "../../src/shared/domain";
import { toPublicSnapshot, type ClientCommand } from "../../src/shared/protocol";
import { sequenceRandom } from "../../src/shared/rules/random";
import { resolveDecisionVote } from "../../src/shared/rules/stateMachine";
import { GameRoom } from "../../worker/game/GameRoom";
import { loadRoom, normalizeLoadedRoom, newPrivateRoom, saveRoom, type PersistedRoomState } from "../../worker/game/roomStorage";

const card: DecisionCard = { id: "cave", prompt: "Who enters?", options: [
  { id: "send", label: "Send one volunteer", outcomes: [{ id: "entered", text: "The volunteer enters.", weight: 1, effectTarget: "assigned-actor", resourceDeltas: { health: -10 } }], assignment: { roleLabel: "enter the cave", actorSelection: "group-nominated-living", refusal: { successChanceBps: 3_500, qualitativeRisk: "risky", successOutcomes: [{ id: "sealed", text: "The cave is sealed.", weight: 1, resourceDeltas: { shelter: -5 } }] } } },
  { id: "wait", label: "Wait", outcomes: [{ id: "waited", text: "They wait.", weight: 1 }] },
] };

function decisionRoom(): PersistedRoomState {
  const room = newPrivateRoom({ code: "ABC234", playerId: "p_a", now: 0, passwordSalt: new Uint8Array(16), passwordDigest: new Uint8Array(32) });
  const players: Player[] = [
    { id: "p_a", displayName: "A", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 },
    { id: "p_b", displayName: "B", status: "alive", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 1 },
    { id: "p_g", displayName: "Ghost", status: "ghost", characterId: "cast-tony", ready: true, connected: true, joinedAt: 2 },
  ];
  room.players = Object.fromEntries(players.map((player) => [player.id, player]));
  room.characters = Object.fromEntries(players.map((player) => [player.characterId!, { characterId: player.characterId!, status: player.status, resources: { ...INITIAL_CHARACTER_RESOURCES, health: player.status === "ghost" ? 0 : 100 } }]));
  room.phase = "decision";
  room.phaseStartedAt = 0;
  room.votingOpensAt = 0;
  room.earliestResolveAt = 9_000;
  room.phaseDeadlineAt = 10_000;
  room.phaseEndsAt = 10_000;
  room.deck = [card];
  room.currentDecisionId = card.id;
  room.eligibleVoterIds = players.map(({ id }) => id);
  return room;
}

type CommandHandler = { mutateForCommand(room: PersistedRoomState, playerId: string, command: ClientCommand, now: number): null | { code: string; message: string } };
function mutate(room: PersistedRoomState, playerId: string, command: ClientCommand, now: number) {
  return (Object.create(GameRoom.prototype) as CommandHandler).mutateForCommand(room, playerId, command, now);
}

function envelope(commandId: string, type: ClientCommand["type"], payload: unknown): ClientCommand {
  return { protocolVersion: PROTOCOL_VERSION, commandId, type, payload } as ClientCommand;
}

function pendingRoom(): PersistedRoomState {
  const room = decisionRoom();
  room.votesByPlayer = { p_a: "send", p_b: "send", p_g: "wait" };
  room.assignmentNominationsByPlayer = { p_a: "cast-samantha", p_b: "cast-samantha" };
  return resolveDecisionVote(room, 1_000, sequenceRandom([])) as PersistedRoomState;
}

function commandHarness(initialRoom: PersistedRoomState) {
  let storedRoom = initialRoom;
  const storage = {
    async get() { return storedRoom; },
    async put(_key: string, room: PersistedRoomState) { storedRoom = room; },
    async setAlarm() {},
    async deleteAlarm() {},
  };
  const harness = Object.assign(Object.create(GameRoom.prototype), {
    ctx: { storage },
    getConnections: () => [],
    sendViewerSnapshots: async () => {},
    sendSnapshot: () => {},
  }) as unknown as { applyCommand(connection: { send(value: string): void }, playerId: string, command: ClientCommand, now: number): Promise<void> };
  return { harness, readRoom: () => storedRoom };
}

describe("persisted assignment lifecycle", () => {
  it("requires a living nomination, lets a ghost nominate, and clears nominations on a replacement normal vote", () => {
    const room = decisionRoom();
    expect(mutate(room, "p_a", envelope("missing", "vote.submit", { optionId: "send" }), 1)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
    expect(mutate(room, "p_g", envelope("ghost-nom", "vote.submit", { optionId: "send", assignedCharacterId: "cast-samantha" }), 1)).toBeNull();
    expect(room.assignmentNominationsByPlayer?.p_g).toBe("cast-samantha");
    expect(mutate(room, "p_a", envelope("dead", "vote.submit", { optionId: "send", assignedCharacterId: "cast-tony" }), 1)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
    expect(mutate(room, "p_g", envelope("replace", "vote.submit", { optionId: "wait" }), 2)).toBeNull();
    expect(room.assignmentNominationsByPlayer?.p_g).toBeUndefined();
  });

  it("shows the same persisted assignment to reconnecting actor and no controls or risk to anyone else", () => {
    const room = pendingRoom();
    const actor = toPublicSnapshot(room, "p_b");
    const other = toPublicSnapshot(room, "p_a");
    expect(actor.activeAssignment).toEqual(other.activeAssignment);
    expect(actor.viewerAssignment).toEqual({ canRespond: true, qualitativeRisk: "risky" });
    expect(other.viewerAssignment).toBeUndefined();
    expect(JSON.stringify(other)).not.toContain("successChanceBps");
    expect(JSON.stringify(other)).not.toContain("try-refuse");
  });

  it("rejects unauthorized, stale, dead, and deadline responses", () => {
    const room = pendingRoom();
    const id = room.pendingAssignment!.id;
    expect(mutate(room, "p_a", envelope("wrong", "assignment.respond", { assignmentId: id, response: "accept" }), 2_000)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
    expect(mutate(room, "p_b", envelope("stale", "assignment.respond", { assignmentId: "assignment-old", response: "accept" }), 2_000)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
    expect(mutate(room, "p_b", envelope("late", "assignment.respond", { assignmentId: id, response: "accept" }), room.pendingAssignment!.deadlineAt)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
    room.players.p_b = { ...room.players.p_b!, status: "ghost" };
    expect(mutate(room, "p_b", envelope("dead", "assignment.respond", { assignmentId: id, response: "accept" }), 2_000)).toMatchObject({ code: "INVALID_ASSIGNMENT" });
  });

  it("persists one final event and treats a duplicate command ID as a snapshot replay", async () => {
    const room = pendingRoom();
    const { harness, readRoom } = commandHarness(room);
    const command = envelope("accept-once", "assignment.respond", { assignmentId: room.pendingAssignment!.id, response: "accept" });
    await harness.applyCommand({ send() {} }, "p_b", command, 2_000);
    expect(readRoom().phase).toBe("reveal");
    expect(readRoom().eventHistory).toHaveLength(1);
    const health = readRoom().characters["cast-samantha"]!.resources.health;
    await harness.applyCommand({ send() {} }, "p_b", command, 2_001);
    expect(readRoom().eventHistory).toHaveLength(1);
    expect(readRoom().characters["cast-samantha"]!.resources.health).toBe(health);
  });

  it("resolves a timed-out assignment through a real Durable Object alarm and durable storage", async () => {
    const namespace = env.GAME_ROOM as DurableObjectNamespace<GameRoom>;
    const stub = namespace.get(namespace.newUniqueId());
    const now = Date.now();
    const room = pendingRoom();
    room.createdAt = now - 1_000;
    room.lastActivityAt = now - 1_000;
    room.expiresAt = now + 60_000;
    room.phaseDeadlineAt = now - 1;
    room.phaseEndsAt = now - 1;
    room.pendingAssignment = { ...room.pendingAssignment!, createdAt: now - 15_001, deadlineAt: now - 1 };

    await runInDurableObject(stub, async (_instance, state) => {
      await saveRoom(state.storage, room);
      await state.storage.setAlarm(now + 1_000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const stored = await runInDurableObject(stub, (_instance, state) => loadRoom(state.storage));
    expect(stored?.phase).toBe("reveal");
    expect(stored?.pendingAssignment).toBeUndefined();
    expect(stored?.eventHistory).toHaveLength(1);
    expect(stored?.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("timeout-accepted");

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const replayed = await runInDurableObject(stub, (_instance, state) => loadRoom(state.storage));
    expect(replayed?.phase).toBe("reveal");
    expect(replayed?.eventHistory).toHaveLength(1);
    expect(replayed?.eventHistory[0]?.id).toBe(stored?.eventHistory[0]?.id);
  });

  it("normalizes assignment fields on an older stored room without changing its identity", () => {
    const legacy = decisionRoom();
    delete legacy.assignmentNominationsByPlayer;
    delete legacy.resolutionSequence;
    const normalized = normalizeLoadedRoom(legacy);
    expect(normalized.code).toBe(legacy.code);
    expect(normalized.assignmentNominationsByPlayer).toEqual({});
    expect(normalized.resolutionSequence).toBe(0);
  });

  it("preserves saved crew dialogue when a room is loaded again", () => {
    const room = decisionRoom();
    room.eventHistory = [{ id: "event-dialogue", text: "The repair failed.", createdAt: 1, outcomeId: "radio-repair-failed", socialCue: "setback", crewDialogue: {
      id: "event-dialogue:crew:repair-failed-debug-v1", templateId: "repair-failed-debug-v1", motifIds: ["drupal-debug"],
      lines: [
        { characterId: "cast-daniel", text: "Let's check the next cause.", emotion: "neutral", animation: "agree" },
        { characterId: "cast-samantha", text: "We'll work out another plan.", emotion: "neutral", animation: "agree" },
      ],
    } }];
    const normalized = normalizeLoadedRoom(room);
    expect(normalized.eventHistory[0]?.crewDialogue).toEqual(room.eventHistory[0]?.crewDialogue);
  });

  it("migrates a legacy ending without declaring living characters dead", () => {
    const legacy = decisionRoom();
    legacy.phase = "ending";
    legacy.endingId = "legacy-ending" as never;
    const normalized = normalizeLoadedRoom(legacy);
    expect(normalized.endingId).toBe("group-escape");
    expect(normalized.escapeResult).toMatchObject({
      type: "group-escape",
      escapedCharacterIds: ["cast-daniel", "cast-samantha"],
      deadCharacterIds: ["cast-tony"],
      strandedCharacterIds: [],
    });
    expect(normalized.motorboat).toMatchObject({ node: "complete", completion: "group-escape" });
  });
});
