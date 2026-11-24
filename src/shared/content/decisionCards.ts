import type { DecisionCard, Outcome, ResourceKey } from "../domain";
import { decisionCopy } from "./strings.en";

type Draft = [weight: number, text: string, deltas?: Partial<Record<ResourceKey, number>>, eliminate?: boolean];
const makeOutcomes = (optionId: string, drafts: Draft[]): Outcome[] => drafts.map(([weight, text, resourceDeltas, eliminateRandomLiving], index) => ({ id: `${optionId}-outcome-${index + 1}`, weight, text, ...(resourceDeltas ? { resourceDeltas } : {}), ...(eliminateRandomLiving ? { eliminateRandomLiving } : {}) }));
function card(id: keyof typeof decisionCopy, groups: [Draft[], Draft[], Draft[]]): DecisionCard {
  const copy = decisionCopy[id];
  return { id, prompt: copy.prompt, options: copy.options.map((label, index) => { const optionId = `${id}-option-${index + 1}`; return { id: optionId, label, outcomes: makeOutcomes(optionId, groups[index]!) }; }) };
}

function caveAssignmentCard(): DecisionCard {
  const result = card("cave-of-bad-ideas", [
    [[70, "The crew brings back dry firewood and uses salvage to brace the cave-side shelter. The useful haul lifts spirits.", { shelter: 8, morale: 5 }], [30, "A startled bat swarm scratches the crew as they retreat from the cave.", { health: -7 }]],
    [[60, "The volunteer returns with canned peaches for the crew.", { food: 12 }], [30, "The volunteer returns with a deeply unhelpful map, disappointing the crew.", { morale: -6 }], [10, "The volunteer is lost in the cave collapse. The crew recovers only their meeting notes.", {}, true]],
    [[80, "The agenda is so dense that even danger stays outside.", { shelter: 7 }], [20, "Rain dissolves the agenda and several illusions.", { shelter: -6 }]],
  ]);
  const assigned = result.options[1]!;
  assigned.outcomes = assigned.outcomes.map((outcome) => ({ ...outcome, effectTarget: "assigned-actor" }));
  assigned.assignment = {
    roleLabel: "enter the humming cave",
    actorSelection: "group-nominated-living",
    refusal: {
      successChanceBps: 3_500,
      qualitativeRisk: "risky",
      successOutcomes: [{
        id: "cave-of-bad-ideas-option-2-refusal-success",
        weight: 1,
        text: "The volunteer refuses, so the crew seals the humming entrance with shelter panels. The argument costs morale and the panels weaken camp cover.",
        resourceDeltas: { shelter: -8, morale: -5 },
      }],
    },
  };
  return result;
}

export const DECISION_CARDS: DecisionCard[] = [
  card("wreckage-lighter", [
    [[55, "The lighter works. The crew dries and patches the shelter around a small fire, and spirits lift.", { morale: 10, shelter: 4 }], [35, "The lighter is damp but salvageable; drying it costs time and morale.", { morale: -4 }], [10, "A sleeve fire spreads through camp, burning the crew and killing one survivor before it is contained.", { health: -12 }, true]],
    [[75, "The crew uses the intact kit to treat everyone's worst injuries.", { health: 15 }], [25, "The kit is mostly airline soap. It cleans minor cuts, but the crew is disappointed.", { morale: -3, health: 3 }]],
    [[60, "The cart contains enough crackers for a feast.", { food: 14 }], [40, "The expired crackers are discarded, costing the crew food and morale.", { food: -6, morale: -4 }]],
  ]),
  card("coconut-jury", [
    [[62, "A generous coconut harvest lands nearby.", { food: 12 }], [30, "Nothing falls except everyone's confidence.", { morale: -6 }], [8, "A falling coconut bruises the crew and fatally strikes one survivor.", { health: -10 }, true]],
    [[80, "The catcher works, gathering food while its frame reinforces the shelter.", { food: 8, shelter: 5 }], [20, "The catcher collapses onto the builders, bruising the crew.", { health: -5 }]],
    [[70, "The boar accepts the crew's offering and unlikely truce. The successful negotiation lifts spirits.", { morale: 6 }], [30, "The ambassador is pelted during negotiations, and the whole crew is caught in the charge.", { health: -7, morale: -3 }]],
  ]),
  card("smoke-signal", [
    [[65, "The smoke is visible and aggressively damp.", { morale: 5 }], [35, "Everyone is now marinated in swamp smell.", { morale: -6 }]],
    [[70, "The crew burns shelter cushions for a proud black plume that lifts spirits, leaving camp with less cover.", { morale: 10, shelter: -4 }], [30, "The cushions release toxic smoke that makes the crew ill.", { health: -6 }]],
    [[75, "The banner finally motivates someone: a distant boat.", { morale: 12 }], [25, "The slogans survive the fire. Spirits do not.", { morale: -9 }]],
  ]),
  card("mystery-berries", [
    [[55, "The crew tests the berries and finds a safe, filling food source.", { food: 8 }], [35, "The whole tasting panel gets sick and spends the afternoon recovering.", { health: -10 }], [10, "The berries poison the whole tasting party; one survivor dies before the others recover.", { health: -12 }, true]],
    [[80, "The life vest holds together, and its absurdly serious inspection gives the crew a laugh.", { morale: 7 }], [20, "The vest deflates and leaves camp short of useful flotation and shelter material.", { shelter: -4 }]],
    [[85, "The crew leaves the suspicious berries alone and rests instead, recovering a little strength.", { health: 5 }], [15, "No safe berries are found. The crew uses six food units while searching and morale drops.", { food: -6, morale: -3 }]],
  ]),
  card("shelter-politics", [
    [[70, "The beach shelter goes up with an ocean view; morale rises.", { morale: 8, shelter: 5 }], [30, "The tide reaches the unfinished beach shelter and tears away its supports.", { shelter: -12 }]],
    [[70, "The cliffside shelter blocks the wind beautifully.", { shelter: 12 }], [30, "Falling pebbles hit the crew and batter the unfinished cliffside shelter.", { health: -6 }]],
    [[75, "The fuselage is ugly, dry, and magnificent.", { shelter: 14 }], [25, "Every loose panel squeaks all night.", { morale: -7 }]],
  ]),
  card("boar-diplomacy", [
    [[75, "The boar accepts lunch and a non-aggression pact.", { food: -8, morale: 7 }], [25, "It accepts lunch and requests dinner.", { food: -14 }]],
    [[65, "The boar fears the phrase actionable synergies; the crew's bluff works and lifts morale.", { morale: 9 }], [35, "It counters with an extremely actionable charge that bruises the whole crew.", { health: -9 }]],
    [[58, "The boar is rated meets expectations and leaves, lifting the crew's spirits.", { morale: 10 }], [30, "It disputes the review in a loud appeal, injuring the crew and damaging the shelter.", { health: -8, shelter: -5 }], [12, "The boar gores one survivor before fleeing. The crew is shaken by the loss.", { morale: -8 }, true]],
  ]),
  card("rainwater-budget", [
    [[80, "The bottles fill with clean rainwater, restoring the crew's strength.", { health: 8, water: 12 }], [20, "Half the caps are missing. The crew saves a little water, but the leak is frustrating.", { water: 3, morale: -4 }]],
    [[70, "The slide becomes a glorious orange reservoir, filling the crew's water stores.", { water: 12 }], [30, "It becomes a glorious orange waterslide. The crew gets bruised but laughs at the mess.", { health: -5, morale: 6 }]],
    [[65, "The rain ignores the policy and tears through the shelter.", { shelter: -12 }], [35, "A loophole collects one mug of water. The meager gain and argument lower morale.", { water: 2, morale: -5 }]],
  ]),
  card("distress-flare", [
    [[55, "A distant vessel changes course toward the island.", { morale: 18 }], [45, "The flare impresses three birds and nobody else.", { morale: -8 }]],
    [[75, "Night makes the signal impossible to miss.", { morale: 14 }], [25, "Rain makes the flare impossible to light.", { morale: -10 }]],
    [[55, "Against precedent, the launch is perfect.", { morale: 16 }], [35, "The flare sets part of the shelter alight before the crew puts it out.", { shelter: -9 }], [10, "The flare ignites camp supplies, burning the crew and killing one survivor before the fire is contained.", { health: -10 }, true]],
  ]),
  caveAssignmentCard(),
  card("raft-committee", [
    [[55, "The raft floats for an inspiring seven minutes, giving the crew confidence.", { morale: 10 }], [45, "The raft achieves immediate submarine status and sinks some rations, disappointing the crew.", { food: -7, morale: -8 }]],
    [[85, "Reinforcements create a sturdy escape platform and give the crew confidence.", { morale: 8 }], [15, "The extra rope ties the raft to a tree, wasting time and morale.", { morale: -4 }]],
    [[70, "Alignment produces a checklist and a safer launch plan, lifting morale.", { morale: 5 }], [30, "The meeting outlasts the favorable tide. The crew uses rations while waiting and morale drops.", { food: -6, morale: -7 }]],
  ]),
];
