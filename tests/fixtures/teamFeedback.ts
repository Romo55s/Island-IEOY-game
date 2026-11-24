import { INITIAL_CHARACTER_RESOURCES, type PrivateRoomState } from "../../src/shared/domain";
import { initialCampaignState } from "../../src/shared/rules/stateMachine";
import { initialMotorboatRoute } from "../../src/shared/rules/motorboat";
import { initialDesperationState } from "../../src/shared/desperation/opportunities";

export function feedbackRoom(food = 0): PrivateRoomState {
  const ids = ["cast-jim-young", "cast-tony", "cast-courtney"];
  return { code: "ABC234", revision: 0, phase: "reveal", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_0",
    phaseStartedAt: 0, phaseDeadlineAt: 0, phaseEndsAt: 0, votingOpensAt: null, earliestResolveAt: null,
    players: Object.fromEntries(ids.map((characterId,i) => [`p_${i}`, { id: `p_${i}`, displayName: `Player ${i}`, characterId, status: "alive", ready: true, connected: true, joinedAt: i }])),
    characters: Object.fromEntries(ids.map((characterId,i) => [characterId, { characterId, status: "alive", resources: { ...INITIAL_CHARACTER_RESOURCES, food }, startingItemId: i === 1 ? "knife" : "popcorn-basket" }])),
    resources: { shelter: 50 }, deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ids.map((_,i) => `p_${i}`), eventHistory: [],
    campaign: { ...initialCampaignState(), node: "crew-council" }, motorboat: initialMotorboatRoute(), desperation: initialDesperationState(), resolutionSequence: 0 };
}
