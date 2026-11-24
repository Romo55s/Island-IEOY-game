import type { DecisionCard, Outcome, PrivateRoomState } from "../domain";

const exit = (choice: string, defeated = false): Outcome["campaignEffect"] => ({ type: "story-beat", nextNode: "shelter-reinforcement", choice, ...(defeated ? { addFlag: "bear-defeated" as const } : {}) });
const retreat: Outcome = { id: "bear-retreat", text: "The crew backs away from the bear and abandons some supplies. Everyone returns to camp.", weight: 1, resourceDeltas: { food: -4 }, campaignEffect: exit("bear-retreated") };

export function createBearEncounterCard(state: Pick<PrivateRoomState, "characters">): DecisionCard {
  const living = Object.values(state.characters).filter(c => c.status === "alive");
  const options: DecisionCard["options"] = [{ id: "retreat", label: "Retreat and abandon some food", outcomes: [retreat] }];
  if (living.length && living.every(c => c.resources.food >= 5)) options.push({ id: "distract", label: "Distract the bear with food", outcomes: [{ id: "bear-distracted", text: "The bear takes the supplies while the crew returns safely to camp.", weight: 1, resourceDeltas: { food: -5 }, campaignEffect: exit("bear-distracted") }] });
  for (const [item, id, label, weights, damage] of [
    ["improvised-bow", "hunt-bow", "Hunt the bear with an improvised bow · Risky", [35,45,20], 20],
    ["knife", "hunt-knife", "Fight the bear with a hunting knife · Extremely risky", [15,55,30], 30],
  ] as const) {
    if (!living.some(c => c.startingItemId === item)) continue;
    options.push({ id, label, assignment: { roleLabel: "face the bear", requiredStartingItemId: item, actorSelection: "group-nominated-living", refusal: { successChanceBps: 5000, qualitativeRisk: "uncertain", successOutcomes: [retreat] } }, outcomes: [
      { id: `${id}-success`, text: "The assigned hunter kills the bear. The living crew shares the food and returns to camp.", weight: weights[0], resourceDeltas: { food: 12, morale: 2 }, campaignEffect: exit("bear-hunted", true) },
      { id: `${id}-injury`, text: "The bear injures the assigned hunter. The crew retreats without any food.", weight: weights[1], effectTarget: "assigned-actor", resourceDeltas: { health: -damage }, campaignEffect: exit("bear-injury") },
      { id: `${id}-death`, text: "The bear kills the assigned hunter. The rest of the crew retreats.", weight: weights[2], effectTarget: "assigned-actor", eliminateRandomLiving: true, campaignEffect: exit("bear-fatal") },
    ] });
  }
  return { id: "campaign-bear-encounter", prompt: "A bear blocks the path back to camp and noses through the supplies. What should the crew do?", options };
}
