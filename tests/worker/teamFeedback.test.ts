import { env } from "cloudflare:workers";
import { runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { feedbackRoom } from "../fixtures/teamFeedback";
import { PROTOCOL_VERSION } from "../../src/shared/domain";
import { ClientCommandSchema, PublicGameSnapshotSchema, toPublicSnapshot, type ClientCommand } from "../../src/shared/protocol";
import { beginNextCampaignStep, resolvePendingPrivateChoice } from "../../src/shared/rules/stateMachine";
import { prepareDesperation } from "../../src/shared/desperation/coordinator";
import { sequenceRandom } from "../../src/shared/rules/random";
import { GameRoom } from "../../worker/game/GameRoom";
import { newPrivateRoom, loadRoom, saveRoom, normalizeLoadedRoom, type PersistedRoomState } from "../../worker/game/roomStorage";

function room(): PersistedRoomState {
  return { ...newPrivateRoom({ code:"ABC234",playerId:"p_0",now:Date.now(),passwordSalt:new Uint8Array(16),passwordDigest:new Uint8Array(32) }), ...feedbackRoom() };
}
type Handler = { mutateForCommand(room: PersistedRoomState, playerId: string, command: ClientCommand, now: number): null | {code:string} };
function submit(state: PersistedRoomState, playerId: string, type: string, payload: unknown, now=1) {
  const command=ClientCommandSchema.parse({protocolVersion:PROTOCOL_VERSION,commandId:crypto.randomUUID(),type,payload});
  return (Object.create(GameRoom.prototype) as Handler).mutateForCommand(state,playerId,command,now);
}
function night(): PersistedRoomState {
  const state=room();state.desperation!.groupOfferCount=2;state.desperation!.nightCheckDue=true;
  return prepareDesperation(state,0,sequenceRandom([0,0.4])) as PersistedRoomState;
}

describe("team feedback server boundaries", () => {
  it("requires a valid victim, accepts ghost votes, and keeps victim nominations separate", () => {
    const state=beginNextCampaignStep(room(),0,sequenceRandom([])) as PersistedRoomState;
    state.players.p_2!.status="ghost";state.characters["cast-courtney"]!.status="ghost";
    expect(submit(state,"p_0","vote.submit",{optionId:"attempt"})?.code).toBe("INVALID_OPTION");
    expect(submit(state,"p_0","vote.submit",{optionId:"attempt",targetCharacterId:"cast-courtney"})?.code).toBe("INVALID_OPTION");
    expect(submit(state,"p_2","vote.submit",{optionId:"attempt",targetCharacterId:"cast-tony"})).toBeNull();
    expect(state.targetNominationsByPlayer).toEqual({p_2:"cast-tony"});
    expect(state.assignmentNominationsByPlayer).toEqual({});
    expect(submit(state,"p_2","vote.submit",{optionId:"search"})).toBeNull();
    expect(state.targetNominationsByPlayer).toEqual({});
  });
  it("rejects a bear hunter without the required tool", () => {
    const initial=room();initial.campaign!.node="bear-encounter";
    const state=beginNextCampaignStep(initial,0,sequenceRandom([])) as PersistedRoomState;
    expect(submit(state,"p_0","vote.submit",{optionId:"hunt-knife",assignedCharacterId:"cast-jim-young"})?.code).toBe("INVALID_ASSIGNMENT");
    expect(submit(state,"p_0","vote.submit",{optionId:"hunt-knife",assignedCharacterId:"cast-tony"})).toBeNull();
  });
  it("rejects wrong viewers, ghosts, self-targets, missing targets and stale deadlines", () => {
    const state=night(), choiceId=state.pendingPrivateChoice!.id;
    expect(submit(state,"p_1","private-choice.respond",{choiceId,optionId:"sleep"})?.code).toBe("INVALID_PRIVATE_CHOICE");
    expect(submit(state,"p_0","private-choice.respond",{choiceId,optionId:"attempt-eat"})?.code).toBe("INVALID_PRIVATE_CHOICE");
    expect(submit(state,"p_0","private-choice.respond",{choiceId,optionId:"attempt-eat",targetCharacterId:"cast-jim-young"})?.code).toBe("INVALID_PRIVATE_CHOICE");
    expect(submit(state,"p_0","private-choice.respond",{choiceId,optionId:"sleep",targetCharacterId:"cast-tony"})?.code).toBe("INVALID_PRIVATE_CHOICE");
    expect(submit(state,"p_0","private-choice.respond",{choiceId,optionId:"sleep"},15000)?.code).toBe("INVALID_PRIVATE_CHOICE");
    state.players.p_0!.status="ghost";
    expect(submit(state,"p_0","private-choice.respond",{choiceId,optionId:"sleep"})?.code).toBe("INVALID_PRIVATE_CHOICE");
  });
  it("exposes only actor controls, reveals attempts once, and retains ghost voting", () => {
    const state=night(); const actor=toPublicSnapshot(state,"p_0"), other=toPublicSnapshot(state,"p_1");
    expect(PublicGameSnapshotSchema.safeParse(actor).success).toBe(true);
    expect(other.viewerPrivateChoice).toBeUndefined();
    state.pendingPrivateChoice!.response={optionId:"attempt-eat",targetCharacterId:"cast-tony"};
    const revealed=resolvePendingPrivateChoice(state,1,sequenceRandom([0])) as PersistedRoomState;
    expect(revealed.eventHistory.at(-1)?.desperation).toMatchObject({actorCharacterId:"cast-jim-young",targetCharacterId:"cast-tony",outcomeId:"night-succeeded"});
    expect(revealed.players.p_1!.status).toBe("ghost");
    expect(revealed.eligibleVoterIds).toContain("p_1");
    expect(PublicGameSnapshotSchema.safeParse(toPublicSnapshot(revealed,"p_1")).success).toBe(true);
    expect(resolvePendingPrivateChoice(revealed,2,sequenceRandom([]))).toBe(revealed);
    expect(submit(revealed,"p_0","private-choice.respond",{choiceId:state.pendingPrivateChoice!.id,optionId:"sleep"})?.code).toBe("INVALID_PRIVATE_CHOICE");
  });
  it("loads old rooms with neutral defaults and preserves new opportunity progress", () => {
    const old=room();delete old.desperation;
    expect(normalizeLoadedRoom(old).desperation).toMatchObject({day:0,nightCheckDue:false});
    const current=night();
    expect(normalizeLoadedRoom(structuredClone(current)).pendingPrivateChoice).toEqual(current.pendingPrivateChoice);
    expect(normalizeLoadedRoom(structuredClone(current)).desperation).toEqual(current.desperation);
  });
  it("persists a pending choice through storage and resolves its alarm with the safe default", async () => {
    const stub=env.GAME_ROOM.get(env.GAME_ROOM.idFromName(`hunger-${crypto.randomUUID()}`));
    await runInDurableObject(stub, async (_instance,state) => {
      const pending=night();pending.expiresAt=Date.now()+600000;
      await saveRoom(state.storage,pending);
      const loaded=await loadRoom(state.storage);
      expect(loaded?.pendingPrivateChoice).toEqual(pending.pendingPrivateChoice);
      await state.storage.setAlarm(Date.now()-1);
    });
    await runDurableObjectAlarm(stub);
    await runInDurableObject(stub,async (_instance,state) => {
      const loaded=(await loadRoom(state.storage))!;
      expect(loaded.pendingPrivateChoice).toBeUndefined();
      expect(loaded.eventHistory.some(e => e.desperation)).toBe(false);
      expect(loaded.characters["cast-jim-young"]!.resources.food).toBe(0);
      expect(loaded.phase).toBe("decision");
    });
  });
});
