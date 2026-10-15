import type { DecisionCard, Outcome, ResourceKey } from "../domain";
import { decisionCopy } from "./strings.en";

type Draft = [weight: number, text: string, deltas?: Partial<Record<ResourceKey, number>>, eliminate?: boolean];
const makeOutcomes = (optionId: string, drafts: Draft[]): Outcome[] => drafts.map(([weight, text, resourceDeltas, eliminateRandomLiving], index) => ({ id: `${optionId}-outcome-${index + 1}`, weight, text, ...(resourceDeltas ? { resourceDeltas } : {}), ...(eliminateRandomLiving ? { eliminateRandomLiving } : {}) }));
function card(id: keyof typeof decisionCopy, groups: [Draft[], Draft[], Draft[]]): DecisionCard {
  const copy = decisionCopy[id];
  return { id, prompt: copy.prompt, options: copy.options.map((label, index) => { const optionId = `${id}-option-${index + 1}`; return { id: optionId, label, outcomes: makeOutcomes(optionId, groups[index]!) }; }) };
}

export const DECISION_CARDS: DecisionCard[] = [
  card("wreckage-lighter", [
    [[55, "The lighter works. Campfire morale briefly becomes unbearable.", { morale: 10, shelter: 4 }], [35, "It is damp but salvageable.", { morale: -4 }], [10, "A sleeve catches fire; one survivor joins the smoky ghost department.", { health: -12 }, true]],
    [[75, "The kit is intact and full of reassuring bandages.", { health: 15 }], [25, "Most of it is tiny airline soap.", { morale: -3, health: 3 }]],
    [[60, "The cart contains enough crackers for a feast.", { food: 14 }], [40, "The crackers expired during a previous corporate era.", { food: -6, morale: -4 }]],
  ]),
  card("coconut-jury", [
    [[62, "A generous coconut harvest lands nearby.", { food: 12 }], [30, "Nothing falls except everyone's confidence.", { morale: -6 }], [8, "A coconut makes a decisive leadership change.", { health: -10 }, true]],
    [[80, "The catcher works and looks almost intentional.", { food: 8, shelter: 5 }], [20, "The catcher catches its builders.", { health: -5 }]],
    [[70, "Diplomatic immunity is granted by absolutely no one.", { morale: 6 }], [30, "The ambassador is pelted during negotiations.", { health: -7, morale: -3 }]],
  ]),
  card("smoke-signal", [
    [[65, "The smoke is visible and aggressively damp.", { morale: 5 }], [35, "Everyone is now marinated in swamp smell.", { morale: -6 }]],
    [[70, "A proud black plume climbs into the sky.", { morale: 10, shelter: -4 }], [30, "The cushions release a smell with legal implications.", { health: -6 }]],
    [[75, "The banner finally motivates someone: a distant boat.", { morale: 12 }], [25, "The slogans survive the fire. Spirits do not.", { morale: -9 }]],
  ]),
  card("mystery-berries", [
    [[55, "They taste like victory and mild regret.", { food: 8 }], [35, "The tasting panel spends the afternoon horizontal.", { health: -10 }], [10, "The berries promote one tester to the spirit department.", { health: -12 }, true]],
    [[80, "The life vest remains medically stable.", { morale: 7 }], [20, "It deflates judgmentally.", { shelter: -4 }]],
    [[85, "Restraint preserves everyone's organs.", { health: 5 }], [15, "Hunger files a formal complaint.", { food: -6, morale: -3 }]],
  ]),
  card("shelter-politics", [
    [[70, "Ocean views dramatically improve morale.", { morale: 8, shelter: 5 }], [30, "The tide attends without an invitation.", { shelter: -12 }]],
    [[70, "The cliffs block the wind beautifully.", { shelter: 12 }], [30, "Falling pebbles begin their own stand-up set.", { health: -6 }]],
    [[75, "The fuselage is ugly, dry, and magnificent.", { shelter: 14 }], [25, "Every loose panel squeaks all night.", { morale: -7 }]],
  ]),
  card("boar-diplomacy", [
    [[75, "The boar accepts lunch and a non-aggression pact.", { food: -8, morale: 7 }], [25, "It accepts lunch and requests dinner.", { food: -14 }]],
    [[65, "The boar fears the phrase actionable synergies.", { morale: 9 }], [35, "It counters with an extremely actionable charge.", { health: -9 }]],
    [[58, "The boar is rated meets expectations and leaves.", { morale: 10 }], [30, "It disputes the review in a loud appeal.", { health: -8, shelter: -5 }], [12, "The review ends with an unexpected ghost vacancy.", { morale: -8 }, true]],
  ]),
  card("rainwater-budget", [
    [[80, "Every bottle fills with excellent boring water.", { health: 8, food: 5 }], [20, "Half the caps are missing.", { morale: -4 }]],
    [[70, "The slide becomes a glorious orange reservoir.", { food: 12, shelter: 4 }], [30, "It becomes a glorious orange waterslide.", { health: -5, morale: 6 }]],
    [[65, "The rain ignores the policy and soaks everything.", { shelter: -12 }], [35, "A loophole collects one mug of water.", { food: 2, morale: -5 }]],
  ]),
  card("distress-flare", [
    [[55, "A distant vessel changes course toward the island.", { morale: 18 }], [45, "The flare impresses three birds and nobody else.", { morale: -8 }]],
    [[75, "Night makes the signal impossible to miss.", { morale: 14 }], [25, "Rain makes the flare impossible to light.", { morale: -10 }]],
    [[55, "Against precedent, the launch is perfect.", { morale: 16 }], [35, "The flare draws a fiery question mark.", { shelter: -9 }], [10, "The safety briefing gains a ghost co-presenter.", { health: -10 }, true]],
  ]),
  card("cave-of-bad-ideas", [
    [[70, "The cave contains dry firewood and excellent echoes.", { shelter: 8, morale: 5 }], [30, "The echoes turn out to be bats with opinions.", { health: -7 }]],
    [[60, "The volunteer returns with canned peaches.", { food: 12 }], [30, "The volunteer returns with a deeply unhelpful map.", { morale: -6 }], [10, "Only the volunteer's meeting notes return.", { morale: -10 }, true]],
    [[80, "The agenda is so dense that even danger stays outside.", { shelter: 7 }], [20, "Rain dissolves the agenda and several illusions.", { shelter: -6 }]],
  ]),
  card("raft-committee", [
    [[55, "The raft floats for an inspiring seven minutes.", { morale: 10 }], [45, "The raft achieves immediate submarine status.", { food: -7, morale: -8 }]],
    [[85, "Reinforcements create a sturdy escape platform.", { shelter: 8, morale: 8 }], [15, "The extra rope ties the raft to a tree.", { morale: -4 }]],
    [[70, "Alignment produces a checklist and a safer launch.", { morale: 5, shelter: 4 }], [30, "The meeting outlasts the favorable tide.", { food: -6, morale: -7 }]],
  ]),
];
