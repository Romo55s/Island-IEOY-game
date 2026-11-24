import type { DecisionCard, Outcome, PrivateRoomState } from "../domain";

const exit = (choice: string, defeated = false): Outcome["campaignEffect"] => ({ type: "story-beat", nextNode: "shelter-reinforcement", choice, ...(defeated ? { addFlag: "bear-defeated" as const } : {}) });
const retreat: Outcome = { id: "bear-retreat", text: "The crew retreats without fighting and returns to camp, abandoning 4 food supplies to the bear.", weight: 1, resourceDeltas: { food: -4 }, campaignEffect: exit("bear-retreated") };

export function createBearEncounterCard(state: Pick<PrivateRoomState, "characters">): DecisionCard {
  const living = Object.values(state.characters).filter(c => c.status === "alive");
  const options: DecisionCard["options"] = [{ id: "retreat", label: "Retreat and abandon some food", outcomes: [retreat] }];
  options.push({ id: "drive-off", label: "Clatter gear and drive the bear back", outcomes: [
    { id: "bear-driven-off", text: "The crew clatters pots and branches in unison. The bear backs away from the trail, but the scramble scatters some food and leaves everyone rattled.", weight: 70, resourceDeltas: { food: -2, morale: -2 }, campaignEffect: exit("bear-driven-off") },
    { id: "bear-charges", text: "The noise startles the bear into a charge. The crew escapes back to camp, bruised, shaken, and missing some food.", weight: 30, resourceDeltas: { health: -8, food: -3, morale: -4 }, campaignEffect: exit("bear-charge") },
  ] });
  if (living.length && living.every(c => c.resources.food >= 5)) options.push({ id: "distract", label: "Distract the bear with food", outcomes: [{ id: "bear-distracted", text: "The crew avoids a fight and returns safely to camp after the bear takes 5 food supplies.", weight: 1, resourceDeltas: { food: -5 }, campaignEffect: exit("bear-distracted") }] });
  for (const [item, id, label, weights, damage] of [
    ["improvised-bow", "hunt-bow", "Hunt the bear with an improvised bow · Risky", [35,45,20], 20],
    ["knife", "hunt-knife", "Fight the bear with a hunting knife · Extremely risky", [15,55,30], 30],
  ] as const) {
    if (!living.some(c => c.startingItemId === item)) continue;
    options.push({ id, label, assignment: { roleLabel: "face the bear", requiredStartingItemId: item, actorSelection: "group-nominated-living", refusal: { successChanceBps: 5000, qualitativeRisk: "uncertain", successOutcomes: [retreat] } }, outcomes: [
      { id: `${id}-success`, text: "The assigned hunter fights successfully and kills the bear. The crew returns to camp with 12 food and +2 morale.", weight: weights[0], resourceDeltas: { food: 12, morale: 2 }, campaignEffect: exit("bear-hunted", true) },
      { id: `${id}-injury`, text: `The bear injures the assigned hunter, who loses ${damage} health. The crew retreats without food.`, weight: weights[1], effectTarget: "assigned-actor", resourceDeltas: { health: -damage }, campaignEffect: exit("bear-injury") },
      { id: `${id}-death`, text: "The bear kills the assigned hunter. The rest of the crew retreats, having lost a crew member.", weight: weights[2], effectTarget: "assigned-actor", eliminateRandomLiving: true, campaignEffect: exit("bear-fatal") },
    ] });
  }
  return { id: "campaign-bear-encounter", prompt: "A bear blocks the path back to camp and noses through the supplies. What should the crew do?", options };
}
