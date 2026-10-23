import { env } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe,expect,it } from "vitest";
import { PROTOCOL_VERSION, type PrivateRoomState } from "../../src/shared/domain";
import { initialMotorboatRoute } from "../../src/shared/rules/motorboat";
import { beginNextMotorboatStep } from "../../src/shared/rules/stateMachine";
import { sequenceRandom } from "../../src/shared/rules/random";
import type { ClientCommand } from "../../src/shared/protocol";
import { GameRoom } from "../../worker/game/GameRoom";
import { processDueEvents } from "../../worker/game/roomScheduler";
import { loadRoom, saveRoom, type PersistedRoomState } from "../../worker/game/roomStorage";

function room(): PrivateRoomState { return {code:"ABC234",revision:0,phase:"reveal",createdAt:0,lastActivityAt:0,hostPlayerId:"p1",phaseStartedAt:0,phaseDeadlineAt:0,votingOpensAt:null,earliestResolveAt:null,phaseEndsAt:0,players:{p1:{id:"p1",displayName:"A",status:"alive",characterId:"c1",ready:true,connected:false,joinedAt:0},p2:{id:"p2",displayName:"B",status:"alive",characterId:"c2",ready:true,connected:false,joinedAt:1}},characters:{c1:{characterId:"c1",status:"alive",resources:{food:50,health:100,morale:50,water:50}},c2:{characterId:"c2",status:"alive",resources:{food:50,health:100,morale:50,water:50}}},resources:{shelter:50},deck:[],decisionIndex:0,currentDecisionId:null,votesByPlayer:{},eligibleVoterIds:["p1","p2"],eventHistory:[],resolutionSequence:0,motorboat:{...initialMotorboatRoute(),node:"fuel-choice",discovered:true,hull:"sound",engine:"broken",fuelCharges:3,fuelVisibility:"known-private"}}; }
const persisted=(value:PrivateRoomState)=>({...value,expiresAt:999999,hostMigrationAt:null,hostMigrationPending:false,passwordSalt:new Uint8Array(),passwordDigest:new Uint8Array(),tickets:{},resumeDigestsByPlayer:{},failedAttemptsByAddress:{},processedCommandIdsByPlayer:{}} as PersistedRoomState);

type CommandHandler = { mutateForCommand(room: PersistedRoomState, playerId: string, command: ClientCommand, now: number): null | { code: string; message: string } };
function mutate(room: PersistedRoomState, playerId: string, command: ClientCommand, now: number) {
  return (Object.create(GameRoom.prototype) as CommandHandler).mutateForCommand(room, playerId, command, now);
}

function privateChoiceCommand(commandId: string, choiceId: string, optionId: string, targetCharacterId?: string): ClientCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId,
    type: "private-choice.respond",
    payload: { choiceId, optionId, ...(targetCharacterId ? { targetCharacterId } : {}) },
  } as ClientCommand;
}

describe("motorboat durable scheduling",()=>{
  it("resolves a disconnected fuel finder timeout through the alarm path",()=>{ const pending=beginNextMotorboatStep(room(),100,sequenceRandom([0])); const deadline=pending.phaseDeadlineAt!; const resolved=processDueEvents(persisted(pending),deadline,sequenceRandom([])); expect(resolved.phase).toBe("decision"); expect(resolved.motorboat).toMatchObject({node:"repair",fuelVisibility:"shared",fuelCharges:3}); expect(resolved.eventHistory.at(-1)?.motorboat?.boatChange).toBe("fuel-shared"); });
  it("does not replay an already resolved private choice",()=>{ const pending=beginNextMotorboatStep(room(),100,sequenceRandom([0])); const once=processDueEvents(persisted(pending),pending.phaseDeadlineAt!,sequenceRandom([])); const twice=processDueEvents(once,pending.phaseDeadlineAt!,sequenceRandom([])); expect(twice.motorboat?.fuelCharges).toBe(3); expect(twice.eventHistory.filter(({motorboat})=>motorboat?.boatChange==="fuel-shared")).toHaveLength(1); });
  it("rejects unauthorized, stale, invalid, dead, and late private responses",()=>{
    const pending=persisted(beginNextMotorboatStep(room(),100,sequenceRandom([0])));
    const choiceId=pending.pendingPrivateChoice!.id;
    expect(mutate(pending,"p2",privateChoiceCommand("wrong",choiceId,"share"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    expect(mutate(pending,"p1",privateChoiceCommand("stale","old-choice","share"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    expect(mutate(pending,"p1",privateChoiceCommand("invalid",choiceId,"quiet"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    expect(mutate(pending,"p1",privateChoiceCommand("transfer-missing",choiceId,"transfer"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    expect(mutate(pending,"p1",privateChoiceCommand("transfer-self",choiceId,"transfer","c1"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    pending.players.p1={...pending.players.p1!,status:"ghost"};
    expect(mutate(pending,"p1",privateChoiceCommand("dead",choiceId,"share"),101)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
    pending.players.p1={...pending.players.p1!,status:"alive"};
    expect(mutate(pending,"p1",privateChoiceCommand("late",choiceId,"share"),pending.pendingPrivateChoice!.deadlineAt)).toMatchObject({code:"INVALID_PRIVATE_CHOICE"});
  });
  it("resolves a timed-out private choice through a real Durable Object alarm once",async()=>{
    const namespace=env.GAME_ROOM as DurableObjectNamespace<GameRoom>;
    const stub=namespace.get(namespace.newUniqueId());
    const now=Date.now();
    const pending=persisted(beginNextMotorboatStep(room(),now-16_000,sequenceRandom([0])));
    pending.createdAt=now-1_000;
    pending.lastActivityAt=now-1_000;
    pending.expiresAt=now+60_000;
    pending.phaseDeadlineAt=now-1;
    pending.phaseEndsAt=now-1;
    pending.pendingPrivateChoice={...pending.pendingPrivateChoice!,createdAt:now-16_000,deadlineAt:now-1};
    await runInDurableObject(stub,async(_instance,state)=>{
      await saveRoom(state.storage,pending);
      await state.storage.setAlarm(now+1_000);
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const stored=await runInDurableObject(stub,(_instance,state)=>loadRoom(state.storage));
    expect(stored?.phase).toBe("decision");
    expect(stored?.pendingPrivateChoice).toBeUndefined();
    expect(stored?.eventHistory.filter(({motorboat})=>motorboat?.boatChange==="fuel-shared")).toHaveLength(1);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const replayed=await runInDurableObject(stub,(_instance,state)=>loadRoom(state.storage));
    expect(replayed?.eventHistory.filter(({motorboat})=>motorboat?.boatChange==="fuel-shared")).toHaveLength(1);
  });
});
