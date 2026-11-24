import { CHARACTER_CATALOG, INITIAL_CHARACTER_RESOURCES, type PrivateRoomState } from "../../shared/domain";
import { initialCampaignState, beginNextCampaignStep } from "../../shared/rules/stateMachine";
import { initialMotorboatRoute } from "../../shared/rules/motorboat";
import { initialDesperationState } from "../../shared/desperation/opportunities";
import { prepareDesperation } from "../../shared/desperation/coordinator";
import { sequenceRandom } from "../../shared/rules/random";

export function createTeamFeedbackFixture(kind: "bear" | "group" | "night", now: number, count = 3): PrivateRoomState {
  const ids = ["cast-jim-young", "cast-tony", "cast-courtney", ...CHARACTER_CATALOG.map(c => c.id).filter(id => !["cast-jim-young", "cast-tony", "cast-courtney"].includes(id))].slice(0,count);
  const state: PrivateRoomState = { code: "ABC234", revision: 0, phase: "reveal", createdAt: now, lastActivityAt: now, hostPlayerId: "p_0", phaseStartedAt: now, phaseDeadlineAt: now, phaseEndsAt: now, votingOpensAt: null, earliestResolveAt: null,
    players: Object.fromEntries(ids.map((characterId,i) => [`p_${i}`,{id:`p_${i}`,displayName:CHARACTER_CATALOG.find(c => c.id===characterId)!.displayName,characterId,status:"alive",ready:true,connected:true,joinedAt:i}])),
    characters: Object.fromEntries(ids.map((characterId,i) => [characterId,{characterId,status:"alive",resources:{...INITIAL_CHARACTER_RESOURCES,food:kind==="bear"?50:0},startingItemId:i===1?"knife":i===0?"improvised-bow":"popcorn-basket"}])),
    resources:{shelter:50},deck:[],decisionIndex:0,currentDecisionId:null,votesByPlayer:{},eligibleVoterIds:ids.map((_,i)=>`p_${i}`),eventHistory:[],resolutionSequence:0,
    campaign:{...initialCampaignState(),node:kind==="bear"?"bear-encounter":"crew-council"},motorboat:initialMotorboatRoute(),desperation:initialDesperationState() };
  if (kind === "night") {
    state.desperation!.groupOfferCount=2;state.desperation!.nightCheckDue=true;
    return prepareDesperation(state,now,sequenceRandom([0,0.4]));
  }
  return beginNextCampaignStep(state,now,sequenceRandom([]));
}
