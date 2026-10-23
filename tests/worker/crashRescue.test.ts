import { describe, expect, it } from "vitest";
import { DECISION_CARDS } from "../../src/shared/content/decisionCards";
import { INITIAL_CHARACTER_RESOURCES, PROTOCOL_VERSION, type Player, type PrivateRoomState } from "../../src/shared/domain";
import { toPublicSnapshot, type ClientCommand } from "../../src/shared/protocol";
import { sequenceRandom } from "../../src/shared/rules/random";
import { startGame } from "../../src/shared/rules/stateMachine";
import { processDueEvents } from "../../worker/game/roomScheduler";
import { newPrivateRoom, type PersistedRoomState } from "../../worker/game/roomStorage";
import { GameRoom } from "../../worker/game/GameRoom";

type CrashCommandHandler = {
  mutateForCommand(
    room: PersistedRoomState,
    playerId: string,
    command: { type: "crash.item.submit"; payload: { itemId: string } } | { type: "crash.rescue.submit"; payload: { targetCharacterId: string } },
    now: number,
  ): null | { code: string; message: string };
};

function mutateCrashCommand(room: PersistedRoomState, playerId: string, command: Parameters<CrashCommandHandler["mutateForCommand"]>[2], now: number) {
  const handler = Object.create(GameRoom.prototype) as CrashCommandHandler;
  return handler.mutateForCommand(room, playerId, command, now);
}

function makeCommandHarness(initialRoom: PersistedRoomState) {
  let storedRoom = initialRoom;
  const events: string[] = [];
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
  }) as unknown as {
    applyCommand(connection: { send(value: string): void }, playerId: string, command: ClientCommand, now: number): Promise<void>;
  };
  return { harness, events, readRoom: () => storedRoom };
}

function makeStartedRoom(): PersistedRoomState {
  const room = newPrivateRoom({ code: "ABC234", playerId: "p_a", now: 0, passwordSalt: new Uint8Array(16), passwordDigest: new Uint8Array(32) });
  const players: Player[] = [
    { id: "p_a", displayName: "Tony", status: "alive", characterId: "cast-tony", ready: true, connected: true, joinedAt: 1 },
    { id: "p_b", displayName: "Daniel", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 2 },
  ];
  room.players = Object.fromEntries(players.map((player) => [player.id, player]));
  room.characters = Object.fromEntries(players.map(({ characterId }) => [characterId!, { characterId: characterId!, status: "alive", resources: { ...INITIAL_CHARACTER_RESOURCES } }]));
  return startGame(room as PrivateRoomState, 0, DECISION_CARDS, sequenceRandom([...Array(9).fill(0), 0, 0, 0, 0.99, 0.99, 0.99])) as PersistedRoomState;
}

describe("persisted crash-choice lifecycle", () => {
  it("keeps offers viewer-private, then resolves duplicate targets once for the room", () => {
    let room = makeStartedRoom();
    room = processDueEvents(room, room.phaseDeadlineAt!, sequenceRandom([]));
    expect(room.phase).toBe("crashItemChoice");
    const tonySnapshot = toPublicSnapshot(room, "p_a");
    const danielSnapshot = toPublicSnapshot(room, "p_b");
    expect(tonySnapshot.crashItemOffer).toEqual(room.crashItemOffersByPlayer?.p_a);
    expect(danielSnapshot.crashItemOffer).toEqual(room.crashItemOffersByPlayer?.p_b);
    expect(JSON.stringify(tonySnapshot)).not.toContain(room.crashItemOffersByPlayer?.p_b?.[0] ?? "__missing__");

    room.crashItemsByPlayer = Object.fromEntries(Object.entries(room.crashItemOffersByPlayer ?? {}).map(([id, offer]) => [id, offer[0]!]));
    room = processDueEvents(room, room.phaseStartedAt! + 1, sequenceRandom([]));
    expect(room.phase).toBe("crashRescueChoice");
    const rescueSnapshot = toPublicSnapshot(room, "p_a");
    expect(rescueSnapshot.viewerCrashChoices?.selectedItemId).toBe(room.crashItemsByPlayer?.p_a);
    expect(rescueSnapshot.characters.find(({ characterId }) => characterId === "cast-daniel")).not.toHaveProperty("startingItemId");
    room.rescueTargetsByPlayer = { p_a: "cast-daniel" };
    const privateRescueChoice = toPublicSnapshot(room, "p_a");
    const otherPlayerView = toPublicSnapshot(room, "p_b");
    expect(privateRescueChoice.viewerCrashChoices?.selectedTargetCharacterId).toBe("cast-daniel");
    expect(otherPlayerView.viewerCrashChoices?.hasSelectedRescueTarget).toBe(false);
    expect(otherPlayerView).not.toHaveProperty("rescueTargetsByPlayer");
    room.rescueTargetsByPlayer = { ...room.rescueTargetsByPlayer, p_b: "cast-daniel" };
    room = processDueEvents(room, room.phaseStartedAt! + 1, sequenceRandom([0.1, 0.2]));
    expect(room.phase).toBe("crashResolution");
    expect(room.crashResolution?.attempts).toHaveLength(2);
    expect(room.crashResolution?.savedCharacterIds).toEqual(["cast-daniel"]);
    expect(toPublicSnapshot(room, "p_a").crashResolution).toEqual(toPublicSnapshot(room, "p_b").crashResolution);
  });

  it("uses the first offered item for a player who misses the item deadline", () => {
    let room = makeStartedRoom();
    room.players.p_b!.connected = false;
    room = processDueEvents(room, room.phaseDeadlineAt!, sequenceRandom([]));
    const defaultItem = room.crashItemOffersByPlayer?.p_b?.[0];
    expect(room.phase).toBe("crashItemChoice");
    room.crashItemsByPlayer = { p_a: room.crashItemOffersByPlayer!.p_a![1]! };
    room = processDueEvents(room, room.phaseStartedAt! + 1, sequenceRandom([]));
    expect(room.phase).toBe("crashRescueChoice");
    expect(room.crashItemsByPlayer?.p_b).toBe(defaultItem);
    expect(room.characters["cast-daniel"]?.startingItemId).toBe(defaultItem);
  });

  it("recovers expired choice deadlines and does not resolve a committed crash report twice", () => {
    let room = makeStartedRoom();
    room = processDueEvents(room, room.phaseDeadlineAt!, sequenceRandom([]));
    room.crashItemsByPlayer = Object.fromEntries(Object.entries(room.crashItemOffersByPlayer ?? {}).map(([id, offer]) => [id, offer[0]!]));
    room = processDueEvents(room, room.phaseStartedAt! + 1, sequenceRandom([]));
    expect(room.phase).toBe("crashRescueChoice");
    room.rescueTargetsByPlayer = { p_a: "cast-daniel" };
    const resolutionTime = room.phaseDeadlineAt!;
    const resolved = processDueEvents(room, resolutionTime, sequenceRandom([0.1]));
    expect(resolved.phase).toBe("crashResolution");
    expect(resolved.crashResolution?.attempts).toHaveLength(1);
    const retry = processDueEvents(resolved, resolutionTime, sequenceRandom([]));
    expect(retry).toEqual(resolved);
    expect(retry.crashResolution?.attempts).toHaveLength(1);
  });

  it("accepts replacement selections before lock-in and rejects choices at or after the deadline", () => {
    let room = makeStartedRoom();
    room = processDueEvents(room, room.phaseDeadlineAt!, sequenceRandom([]));
    const itemDeadline = room.phaseDeadlineAt!;
    const offer = room.crashItemOffersByPlayer!.p_a!;
    expect(mutateCrashCommand(room, "p_a", { type: "crash.item.submit", payload: { itemId: offer[0]! } }, itemDeadline - 1)).toBeNull();
    expect(mutateCrashCommand(room, "p_a", { type: "crash.item.submit", payload: { itemId: offer[1]! } }, itemDeadline - 1)).toBeNull();
    expect(room.crashItemsByPlayer?.p_a).toBe(offer[1]);
    expect(mutateCrashCommand(room, "p_a", { type: "crash.item.submit", payload: { itemId: offer[2]! } }, itemDeadline)).toMatchObject({ code: "WRONG_PHASE" });
    expect(room.crashItemsByPlayer?.p_a).toBe(offer[1]);

    room = processDueEvents(room, itemDeadline, sequenceRandom([]));
    const rescueDeadline = room.phaseDeadlineAt!;
    expect(mutateCrashCommand(room, "p_a", { type: "crash.rescue.submit", payload: { targetCharacterId: "cast-daniel" } }, rescueDeadline - 1)).toBeNull();
    expect(mutateCrashCommand(room, "p_a", { type: "crash.rescue.submit", payload: { targetCharacterId: "cast-daniel" } }, rescueDeadline)).toMatchObject({ code: "WRONG_PHASE" });
  });

  it("authorizes admitted players and ignores a duplicate command ID without replacing the first choice", async () => {
    let room = makeStartedRoom();
    room = processDueEvents(room, room.phaseDeadlineAt!, sequenceRandom([]));
    const { harness, events, readRoom } = makeCommandHarness(room);
    const connection = { send(value: string) { events.push(value); } };
    const offer = room.crashItemOffersByPlayer!.p_a!;
    const first = { protocolVersion: PROTOCOL_VERSION, commandId: "item-once", type: "crash.item.submit", payload: { itemId: offer[0]! } } as ClientCommand;
    await harness.applyCommand(connection, "p_a", first, room.phaseStartedAt! + 1);
    const duplicate = { ...first, payload: { itemId: offer[1]! } } as ClientCommand;
    await harness.applyCommand(connection, "p_a", duplicate, room.phaseStartedAt! + 2);
    expect(readRoom().crashItemsByPlayer?.p_a).toBe(offer[0]);

    const unknown = { protocolVersion: PROTOCOL_VERSION, commandId: "unknown-player", type: "crash.item.submit", payload: { itemId: offer[0]! } } as ClientCommand;
    await harness.applyCommand(connection, "p_unknown", unknown, room.phaseStartedAt! + 3);
    expect(JSON.parse(events.at(-1)!).payload).toMatchObject({ code: "UNAUTHORIZED", commandId: "unknown-player" });
  });

  it("accepts the group vote from a ghost player after opening rescue resolution", async () => {
    const room = makeStartedRoom();
    room.phase = "decision";
    room.currentDecisionId = room.deck[0]!.id;
    room.phaseStartedAt = 100;
    room.phaseDeadlineAt = 50_000;
    room.phaseEndsAt = 50_000;
    room.votingOpensAt = 100;
    room.earliestResolveAt = 40_000;
    room.players.p_a!.status = "ghost";
    room.characters[room.players.p_a!.characterId!]!.status = "ghost";
    const { harness, readRoom } = makeCommandHarness(room);
    const command: ClientCommand = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "ghost-ballot",
      type: "vote.submit",
      payload: { optionId: room.deck[0]!.options[0]!.id },
    };
    await harness.applyCommand({ send() {} }, "p_a", command, 200);
    expect(readRoom().players.p_a?.status).toBe("ghost");
    expect(readRoom().votesByPlayer.p_a).toBe(room.deck[0]!.options[0]!.id);
  });

});
