import type { CampaignOutcomeEffect, CampaignState, CampaignStoryFlag, DecisionCard, Outcome } from "../domain";

export const CAMPAIGN_DECISION_IDS = {
  shoreline: "campaign-shoreline-priority",
  firstNight: "campaign-first-night",
  daybreak: "campaign-daybreak-survey",
  freshwater: "campaign-freshwater-run",
  wildlife: "campaign-wildlife-encounter",
  medical: "campaign-medical-triage",
  cave: "campaign-cave-expedition",
  shelter: "campaign-shelter-reinforcement",
  council: "campaign-crew-council",
  storm: "campaign-storm-warning",
  escapeProject: "campaign-escape-project",
  signalPreparation: "campaign-signal-preparation",
  signalApproach: "campaign-signal-approach",
  signalWindow: "campaign-signal-window",
  signalAttempt: "campaign-signal-attempt",
  coastalExpedition: "campaign-coastal-expedition",
  coastalHazard: "campaign-coastal-hazard",
} as const;

const outcome = (id: string, text: string, campaignEffect: NonNullable<Outcome["campaignEffect"]>, weight = 1, resourceDeltas?: Outcome["resourceDeltas"]): Outcome => ({
  id, text, weight, campaignEffect, ...(resourceDeltas ? { resourceDeltas } : {}),
});

export const SHORELINE_PRIORITY_CARD: DecisionCard = {
  id: CAMPAIGN_DECISION_IDS.shoreline,
  prompt: "The tide is rising around the wreck. What should the crew secure first?",
  options: [
    { id: "recover-radio", label: "Pull the radio parts from the fuselage", outcomes: [outcome("radio-parts-recovered", "The transmitter is cracked, but its battery and aerial survive. Someone scrapes a hand on the wreck.", { type: "shoreline", choice: "salvage" }, 1, { health: -4 })] },
    { id: "move-to-cover", label: "Get everyone under cover before dark", outcomes: [outcome("cover-secured", "The crew reaches a sheltered patch above the tide and braces it with useful pieces of the fuselage.", { type: "shoreline", choice: "shelter" }, 1, { shelter: 10, morale: 3 })] },
    { id: "scout-coast", label: "Scout the coast for a way off the island", outcomes: [outcome("cove-located", "The scout spots a narrow cove and a battered boat among the rocks. Getting back costs time and a little skin.", { type: "shoreline", choice: "scout" }, 1, { health: -5 })] },
  ],
};

function storyOutcome(id: string, text: string, weight: number, nextNode: CampaignState["node"], choice: string, resourceDeltas?: Outcome["resourceDeltas"], addFlag?: CampaignStoryFlag, facts?: { signalPosition?: "low" | "ridge"; coveReached?: true }): Outcome {
  const campaignEffect: CampaignOutcomeEffect = { type: "story-beat", nextNode, choice, ...(addFlag ? { addFlag } : {}), ...facts };
  return { id, text, weight, campaignEffect, ...(resourceDeltas ? { resourceDeltas } : {}) };
}

function storyCard(id: string, prompt: string, nextNode: CampaignState["node"], options: Array<{ id: string; label: string; outcomes: Outcome[] }>): DecisionCard {
  return { id, prompt, options: options.map((option) => ({ ...option, outcomes: option.outcomes.map((outcome) => outcome.campaignEffect?.type === "story-beat" ? { ...outcome, campaignEffect: { ...outcome.campaignEffect, nextNode } } : outcome) })) };
}

export function createDaybreakSurveyCard(): DecisionCard {
  const next = "freshwater-run" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.daybreak, "Morning light exposes what the tide left behind. What should the crew search first?", next, [
    { id: "check-fuselage", label: "Search the dry side of the fuselage", outcomes: [storyOutcome("fuselage-cache", "The crew recovers two bottles, crackers, and salvageable panels from the dry side of the fuselage.", 1, next, "searched-wreck", { food: 8, water: 10 }, "wreck-supplies")] },
    { id: "gather-fruit", label: "Gather fruit along the treeline", outcomes: [storyOutcome("fruit-morning", "The crew finds enough safe fruit to steady everyone's stomach for the next stretch.", 75, next, "gathered-fruit", { food: 12 }), storyOutcome("spoiled-fruit-morning", "Most of the fruit is spoiled. The crew salvages a few safe pieces after an avoidable committee meeting.", 25, next, "spoiled-fruit", { food: 4, morale: -3 })] },
    { id: "map-coast", label: "Mark a route along the coast", outcomes: [storyOutcome("coast-marked", "A dry ridge gives the crew a clear line toward the cove. Someone draws a map on the back of a snack wrapper.", 1, next, "marked-coast", undefined, "coast-route-marked")] },
  ]);
}

export function createFreshwaterRunCard(_campaign: CampaignState): DecisionCard {
  const prompt = "The crew is thirsty and the island's stream is downhill through thick brush. How should they get water?";
  const next = "wildlife-encounter" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.freshwater, prompt, next, [
    { id: "follow-stream", label: "Follow the stream to its source", outcomes: [storyOutcome("spring-found", "The crew finds a clear spring and marks a safe route back to camp.", 70, next, "found-spring", { water: 15, health: -2 }, "freshwater-found"), storyOutcome("muddy-source", "The source is cloudy. Filtering it takes time, but the crew brings back a little usable water.", 30, next, "filtered-water", { water: 5, food: -2 })] },
    { id: "collect-rain", label: "Set up a rain catch from broad leaves", outcomes: [storyOutcome("leaf-catch", "Broad leaves funnel a clean trickle into the bottles. It is not much, but nobody has to drink from a footprint.", 80, next, "caught-rain", { water: 10 }, "freshwater-found"), storyOutcome("leaking-catch", "The leaf gutters leak. The crew saves a mouthful and gains a new respect for bowls.", 20, next, "leaking-rain-catch", { water: 3, morale: -2 })] },
    { id: "ration-water", label: "Ration what remains and turn back", outcomes: [storyOutcome("rationed-water", "The crew turns back before anyone gets lost. The ration is unpleasant but sensible.", 1, next, "rationed-water", { water: -5, morale: 2 })] },
  ]);
}

export function createWildlifeEncounterCard(campaign: CampaignState): DecisionCard {
  const prompt = "A wild boar has reached the food pile. It is large, hungry, and unimpressed by the crew's sign-in sheet.";
  const next = "medical-triage" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.wildlife, prompt, next, [
    { id: "throw-rations", label: "Toss food away from camp", outcomes: [storyOutcome("boar-distracted", "The boar follows the food, leaving the crew and shelter alone. It has excellent priorities.", 1, next, "distracted-boar", { food: -8, morale: 4 })] },
    { id: "make-noise", label: "Clatter pans and drive it toward the trees", outcomes: [storyOutcome("boar-driven-off", "The racket sends the boar crashing back into the brush. Several pans will never sound the same.", 70, next, "drove-off-boar", { morale: 5 }), storyOutcome("boar-charge", "The boar charges through camp, bruising the crew and scattering food.", 30, next, "boar-charged", { health: -8, food: -5 })] },
    { id: "retreat", label: "Give it space and protect the injured", outcomes: [storyOutcome("careful-retreat", "The crew backs away together. The boar takes the food and leaves the people, a rare negotiated settlement.", 1, next, "retreated-from-boar", { food: -6, morale: -2 })] },
  ]);
}

export function createMedicalTriageCard(startingItemIds: string[]): DecisionCard {
  const next = "cave-expedition" as const;
  const options: DecisionCard["options"] = [];
  if (startingItemIds.includes("first-aid-kit")) options.push({ id: "use-first-aid", label: "Use the recovered first-aid kit", outcomes: [storyOutcome("first-aid-used", "Clean bandages and antiseptic bring the worst scrapes under control.", 1, next, "used-first-aid", { health: 10, morale: 3 })] });
  options.push(
    { id: "clean-and-wrap", label: "Clean wounds with boiled water and cloth", outcomes: [storyOutcome("wounds-cleaned", "The crew cleans and wraps the injuries. It costs water, but prevents the day's bruises from getting theatrical.", 1, next, "cleaned-wounds", { health: 5, water: -4 })] },
    { id: "rest-in-shade", label: "Let the injured rest in the shade", outcomes: [storyOutcome("rested-injured", "The injured crew members rest while the others prepare supplies. The group loses time but avoids making things worse.", 1, next, "rested-injured", { health: 3, morale: 2 })] },
  );
  return { id: CAMPAIGN_DECISION_IDS.medical, prompt: "Before the next expedition, how should the crew handle medical care and rest?", options };
}

export function createCaveExpeditionCard(campaign: CampaignState): DecisionCard {
  const next = "bear-encounter" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.cave, campaign.storyFlags.includes("freshwater-found")
    ? "With water gathered, the crew investigates a low cave near camp. Cool air carries the unmistakable smell of dry supplies."
    : "A low cave near camp could hold supplies or simply provide a place for the island to echo at you.", next, [
    { id: "enter-cave", label: "Explore the cave as a crew", outcomes: [storyOutcome("cave-supplies-found", "The crew finds dry kindling, food, and usable boards. The cave is useful, though the echo has been promoted to supervisor.", 65, next, "explored-cave", { food: 8, morale: 3 }, "cave-supplies"), storyOutcome("cave-rockfall", "Loose stones tumble at the entrance. The crew escapes the cave with bruises and no supplies.", 35, next, "cave-rockfall", { health: -7 })] },
    { id: "inspect-entrance", label: "Inspect the entrance without going in", outcomes: [storyOutcome("cave-mapped", "The crew marks the entrance and finds a dry ledge nearby. No one has to negotiate with the echo.", 1, next, "mapped-cave", { shelter: 4 })] },
    { id: "leave-cave", label: "Avoid the cave and return to camp", outcomes: [storyOutcome("cave-avoided", "The crew leaves the cave alone. It responds with several extremely judgmental echoes.", 1, next, "avoided-cave", { morale: 2 })] },
  ]);
}

export function createShelterReinforcementCard(campaign: CampaignState, startingItemIds: string[]): DecisionCard {
  const next = "crew-council" as const;
  const options: DecisionCard["options"] = [];
  if (campaign.storyFlags.includes("wreck-supplies") || campaign.storyFlags.includes("cave-supplies")) options.push({ id: "brace-shelter", label: "Brace the roof with salvaged material", outcomes: [storyOutcome("shelter-braced", "Salvaged panels lock the roof into place. The shelter should survive an ordinary storm and most committee meetings.", 1, next, "braced-shelter", { shelter: 12 }, "shelter-reinforced")] });
  if (startingItemIds.includes("rope")) options.push({ id: "rope-guy-lines", label: "Use the rope to anchor the shelter", outcomes: [storyOutcome("rope-anchors", "The rope anchors hold against the wind. The knot is good enough that nobody wants to ask who tied it.", 1, next, "anchored-shelter", { shelter: 8 }, "shelter-reinforced")] });
  options.push(
    { id: "raise-floor", label: "Raise the sleeping area above the runoff", outcomes: [storyOutcome("raised-sleeping-area", "The crew raises the sleeping platform. It is drier, and only one person loses a sandal to the mud.", 75, next, "raised-shelter", { shelter: 6, morale: 2 }, "shelter-reinforced"), storyOutcome("muddy-platform", "The platform sinks into wet ground. The crew salvages enough material to patch one corner.", 25, next, "shelter-platform-failed", { shelter: 2, morale: -3 })] },
    { id: "leave-shelter", label: "Rest instead of reinforcing the shelter", outcomes: [storyOutcome("supplies-kept", "The crew rests and lifts its spirits, leaving the roof as it was.", 1, next, "rested-instead-of-reinforcing", { morale: 3 })] },
  );
  const hasShelter = campaign.shelterSecured || campaign.storyFlags.includes("shelter-reinforced");
  return { id: CAMPAIGN_DECISION_IDS.shelter, prompt: hasShelter ? "The crew has basic cover. It can reinforce the shelter further or rest." : "The shelter still leaks. The crew can improve it or rest before the next decision.", options };
}

export function createCrewCouncilCard(campaign: CampaignState): DecisionCard {
  const next = "storm-warning" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.council, "The camp is tired, hungry, and has just negotiated with a boar. The crew needs one plan before the weather turns.", next, [
    { id: "share-work", label: "Split the remaining work fairly", outcomes: [storyOutcome("shared-work", "The crew divides the jobs and checks on one another. Nobody agrees that the roster is fair, which means it probably is.", 1, next, "shared-the-work", { morale: 8 })] },
    { id: "protect-essentials", label: "Prioritize food, water, and medical supplies", outcomes: [storyOutcome("essentials-protected", "The crew secures food and water first. It is less inspiring than a speech and more useful than one.", 1, next, "protected-essentials", { food: 5, water: 4, morale: 3 })] },
    { id: "pick-a-leader", label: "Let one survivor make the calls", outcomes: [storyOutcome("leader-chosen", "The crew follows one clear plan. The chosen leader immediately regrets the clarity.", 1, next, "chose-leader", { morale: -2, shelter: 4 })] },
  ]);
}

export function createStormWarningCard(campaign: CampaignState): DecisionCard {
  const next = "escape-project" as const;
  const reinforced = campaign.storyFlags.includes("shelter-reinforced");
  const shelterLabel = reinforced ? "Keep everyone under the reinforced shelter" : "Huddle in the driest part of camp";
  const shelterText = reinforced ? "The braced roof holds while the crew rides out the gusts." : "The crew huddles in the driest corner, shifting away from the leaks.";
  return storyCard(CAMPAIGN_DECISION_IDS.storm, "Clouds seal the ridge and the wind is pulling at camp. The crew has one last preparation before choosing an escape route.", next, [
    { id: "hold-camp", label: shelterLabel, outcomes: [storyOutcome("storm-shelter", shelterText, 1, next, "held-shelter", { health: 3, morale: 4 })] },
    { id: "stage-signal", label: "Move dry supplies to the high ridge", outcomes: [storyOutcome("signal-staged", "The crew stages dry supplies on high ground before the rain arrives. The route is exposed but ready.", 1, next, "staged-signal", { health: -3, morale: 5 }, "signal-kit-prepared")] },
    { id: "mark-coast", label: "Mark the safest path back to the cove", outcomes: [storyOutcome("coast-path-marked", "A line of bright cloth marks the safer path to the cove. It is visible even through the rain.", 1, next, "marked-safe-coast", { morale: 2 }, "coast-route-marked")] },
  ]);
}

export function createSignalPreparationCard(campaign: CampaignState, startingItemIds: string[]): DecisionCard {
  const next = "signal-approach" as const;
  const options: DecisionCard["options"] = [
    { id: "prepare-smoke", label: "Gather dry fuel for a smoky beacon", outcomes: [storyOutcome("smoke-prepared", "The crew builds a dry tinder bundle and shields it from the wind. The signal has a better chance of rising above the canopy.", 1, next, "prepared-smoke", { food: -2 }, "signal-kit-prepared")] },
    { id: "climb-together", label: "Take the safer ridge route together", outcomes: [storyOutcome("ridge-team", "The crew reaches the ridge together. It takes longer, but nobody is left guessing which way the coastline went.", 1, next, "climbed-together", { health: -2, morale: 4 }, "coast-route-marked")] },
  ];
  if (startingItemIds.includes("flare") && !campaign.flareConsumed) options.push({ id: "protect-flare", label: "Keep the flare dry until the signal window", outcomes: [storyOutcome("flare-protected", "The crew wraps the flare in dry cloth and keeps it ready for the opening in the clouds.", 1, next, "protected-flare", undefined, "signal-kit-prepared")] });
  return { id: CAMPAIGN_DECISION_IDS.signalPreparation, prompt: campaign.radioRepaired ? "The radio is ready. Prepare a backup signal before the crew chooses its position." : "Prepare the beacon before the crew chooses its position and waits for a signal window.", options };
}

export function createSignalApproachCard(startingItemIds: string[]): DecisionCard {
  const next = "signal-window" as const;
  const options: DecisionCard["options"] = [
    { id: "take-ridge-trail", label: "Climb the exposed ridge for a clear line to the sea", outcomes: [storyOutcome("ridge-position", "The crew reaches a clear overlook above the canopy. Wind pulls at the signal gear, but the horizon is open.", 1, next, "took-ridge-trail", { health: -3, morale: 2 }, undefined, { signalPosition: "ridge" })] },
    { id: "use-low-path", label: "Stay below the ridge and keep the group together", outcomes: [storyOutcome("low-path-position", "The lower path is safer underfoot but hides the horizon behind wet trees.", 1, next, "took-low-path", { health: 2, morale: 3 }, undefined, { signalPosition: "low" })] },
  ];
  if (startingItemIds.includes("rope")) options.push({ id: "anchor-rope", label: "Anchor the climb with the carried rope", outcomes: [storyOutcome("rope-ridge-position", "The rope steadies the climb and gets the whole crew to the overlook without losing the signal kit.", 1, next, "anchored-ridge-climb", { morale: 4 }, undefined, { signalPosition: "ridge" })] });
  if (startingItemIds.includes("binoculars")) options.push({ id: "survey-horizon", label: "Use binoculars to find the clearest opening", outcomes: [storyOutcome("surveyed-horizon", "The binoculars reveal a break in the cloud line, and the crew reaches the overlook.", 1, next, "surveyed-horizon", { morale: 3 }, undefined, { signalPosition: "ridge" })] });
  return { id: CAMPAIGN_DECISION_IDS.signalApproach, prompt: "The signal gear is ready. The crew needs a safe position with a clear view of the shipping lane.", options };
}

export function createSignalWindowCard(campaign: CampaignState): DecisionCard {
  const next = "signal-attempt" as const;
  return storyCard(CAMPAIGN_DECISION_IDS.signalWindow, campaign.signalPosition === "ridge"
    ? "From the ridge, a gap opens between the clouds. The crew can use it now or wait for a wider opening."
    : "The canopy blocks most of the horizon. A distant engine passes beyond the clouds; the crew has one window to act.", next, [
    { id: "signal-now", label: "Use this opening", outcomes: [storyOutcome("signal-window-now", "The crew commits to the current opening and readies its signal.", 1, next, "committed-current-window", campaign.storyFlags.includes("clear-signal-window") ? { morale: 3 } : { health: -2 }, campaign.storyFlags.includes("clear-signal-window") ? "clear-signal-window" : "storm-gust")] },
    { id: "wait-clear-gap", label: "Wait for the cloud gap to widen", outcomes: [storyOutcome("clear-gap", "The clouds part enough to give the signal a clean path to the sea.", 70, next, "waited-for-clear-gap", { food: -2, morale: 4 }, "clear-signal-window"), storyOutcome("gust-closes-gap", "A hard gust closes the gap and obscures the crew's view of the shipping lane.", 30, next, "storm-closed-signal-gap", { health: -3, morale: -4 }, "storm-gust")] },
  ]);
}

export function createCoastalExpeditionCard(campaign: CampaignState): DecisionCard {
  const next = "coastal-hazard" as const;
  const options: DecisionCard["options"] = [
    { id: "follow-tide-marks", label: campaign.coveLocated ? "Follow the scout's tide marks" : "Search the coast for a sheltered route", outcomes: [storyOutcome("safe-coast-route", "The crew finds a sheltered path above the surf and marks the turns back to camp.", 1, next, "followed-safe-route", { morale: 3 }, "coast-route-marked")] },
    { id: "take-shortcut", label: "Recover a supply crate across the exposed reef", outcomes: [storyOutcome("reef-shortcut", "The crew recovers food from a stranded crate, but sharp rocks bruise everyone on the crossing.", 1, next, "recovered-reef-crate", { health: -5, food: 8 })] },
  ];
  return { id: CAMPAIGN_DECISION_IDS.coastalExpedition, prompt: campaign.signalFailed ? "The signal failed. The crew follows its remaining lead toward the cove while the weather closes in." : "The cove is a long walk from camp. Choose how the crew approaches the exposed coastline.", options };
}

export function createCoastalHazardCard(campaign: CampaignState, startingItemIds: string[]): DecisionCard {
  const next = "motorboat" as const;
  const options: DecisionCard["options"] = [];
  if (startingItemIds.includes("rope")) options.push({ id: "rope-downclimb", label: "Secure the descent with a rope", outcomes: [storyOutcome("secured-descent", "The rope makes the descent controlled and slow. The crew reaches the cove with its supplies intact.", 1, next, "secured-descent", { morale: 3 }, "coast-route-marked", { coveReached: true })] });
  options.push(
    { id: "wait-low-tide", label: "Wait for the surf to ease", outcomes: [storyOutcome("waited-low-tide", "The crew reaches the cove after the surf eases. The delay costs food, but everyone arrives safely.", 1, next, "waited-for-tide", { food: -3, morale: -2 }, undefined, { coveReached: true })] },
    { id: "cross-reef", label: "Cross the reef before the weather worsens", outcomes: [storyOutcome("reef-crossing", "The crew crosses the reef in a hard rush. Everyone reaches the cove, but the rocks take a toll.", 70, next, "crossed-reef", { health: -7, morale: 2 }, undefined, { coveReached: true }), storyOutcome("reef-washback", "A wave sweeps the crew onto a lower shelf. They reach the cove bruised and short on supplies.", 30, next, "washed-back", { health: -10, food: -4 }, undefined, { coveReached: true })] },
  );
  return { id: CAMPAIGN_DECISION_IDS.coastalHazard, prompt: campaign.storyFlags.includes("coast-route-marked") ? "The marked path reaches a steep, wave-cut shelf above the cove. How will the crew get down?" : "The crew reaches a wave-cut shelf above the cove. The rocks are slick and the surf is rising.", options };
}

const preparationAssignment = {
  roleLabel: "repair the damaged radio",
  actorSelection: "group-nominated-living" as const,
  refusal: {
    successChanceBps: 3_500,
    qualitativeRisk: "risky" as const,
    successOutcomes: [outcome("radio-repair-refused", "The assigned mechanic refuses. The crew saves the battery and rests instead.", { type: "preparation", choice: "radio-failed" }, 1, { morale: -3 })],
  },
};

export function createFirstNightCard(campaign: CampaignState): DecisionCard {
  const options: DecisionCard["options"] = [];
  if (campaign.radioRecovered && !campaign.radioRepaired) {
    options.push({
      id: "repair-radio",
      label: "Assign someone to repair the radio",
      assignment: preparationAssignment,
      outcomes: [
        { ...outcome("radio-repaired", "The mechanic bridges the cracked circuit. The radio can send one clear burst if the crew reaches high ground.", { type: "preparation", choice: "radio-repaired" }, 70, { food: -3 }), effectTarget: "assigned-actor" },
        { ...outcome("radio-repair-failed", "The battery holds, but the damaged circuit will not transmit. The crew loses the evening and some patience.", { type: "preparation", choice: "radio-failed" }, 30, { morale: -5 }), effectTarget: "assigned-actor" },
      ],
    });
  }
  options.push(
    { id: "rest-and-ration", label: "Rest and ration what the crew has", outcomes: [outcome("crew-rested", campaign.shelterSecured ? "The crew sleeps under cover, stretches the food, and starts tomorrow less exhausted." : "The crew takes turns resting in the open, stretches the food, and starts tomorrow tired but fed.", { type: "preparation", choice: "rested" }, 1, { health: campaign.shelterSecured ? 8 : 3, food: -3 })] },
    { id: "send-lookout", label: "Send a lookout to higher ground", outcomes: [outcome("lookout-returned", "The lookout returns with a clear view of the coast and a safer trail toward the cove.", { type: "preparation", choice: "lookout" }, 1, { health: -3, morale: 3 })] },
    { id: "forage-before-dark", label: "Forage for food before dark", outcomes: [
      outcome("foraging-success", "The crew finds enough edible fruit for tomorrow and marks the plants for later.", { type: "preparation", choice: "foraged" }, 75, { food: 15 }),
      outcome("foraging-setback", "Most of the fruit is spoiled, but the crew salvages a few safe pieces after a long search.", { type: "preparation", choice: "foraged" }, 25, { food: 5, health: -3 }),
    ] },
  );
  return { id: CAMPAIGN_DECISION_IDS.firstNight, prompt: "Night is coming. How should the crew spend its last useful light?", options };
}

export function createEscapeProjectCard(campaign: CampaignState): DecisionCard {
  const options: DecisionCard["options"] = [];
  if (!campaign.signalAttempted) {
    options.push({ id: "try-signal", label: campaign.radioRepaired ? "Take the repaired radio to high ground" : "Build a signal with a flare or smoky fire", outcomes: [outcome("signal-project-chosen", "The crew commits to one attempt to reach anyone beyond the island.", { type: "route-choice", route: "signal" })] });
  }
  options.push({ id: "try-motorboat", label: campaign.coveLocated || campaign.lookoutSent ? "Return to the cove and prepare the boat" : "Search the coast for a boat", outcomes: [outcome("motorboat-project-chosen", campaign.coveLocated ? "The crew follows the scout's route back to the cove." : "The crew sets out along the coast, hoping a way off the island is still within reach.", { type: "route-choice", route: "motorboat" })] });
  return { id: CAMPAIGN_DECISION_IDS.escapeProject, prompt: "The crew has one clear window to commit to an escape plan. Which lead do you pursue?", options };
}

export function createSignalAttemptCard(campaign: CampaignState, hasFlare: boolean): DecisionCard {
  const preparedBonus = campaign.storyFlags.includes("signal-kit-prepared") ? 10 : 0;
  const positionBonus = campaign.signalPosition === "ridge" ? 10 : 0;
  const weatherBonus = campaign.storyFlags.includes("clear-signal-window") ? 10 : campaign.storyFlags.includes("storm-gust") ? -10 : 0;
  const chance = (base: number, cap: number) => Math.max(5, Math.min(cap, base + positionBonus + preparedBonus + weatherBonus));
  const methods: Array<{ id: string; label: string; method: "radio" | "flare" | "smoke"; successWeight: number; successText: string }> = [];
  if (campaign.radioRepaired) methods.push({ id: "radio-burst", label: "Send one burst from the repaired radio", method: "radio", successWeight: chance(75, 95), successText: `A reply crackles back. A passing vessel has the signal and is closing on the ${campaign.signalPosition === "ridge" ? "ridge" : "coast"}.` });
  if (hasFlare) methods.push({ id: "fire-flare", label: "Use a character's signal flare", method: "flare", successWeight: chance(60, 90), successText: "The flare clears the clouds. A vessel turns toward the bright mark on the coast." });
  methods.push({ id: "smoke-beacon", label: "Build a smoky beacon from camp supplies", method: "smoke", successWeight: chance(40, 80), successText: "The beacon rises above the trees. A vessel answers with a change of course." });

  return {
    id: CAMPAIGN_DECISION_IDS.signalAttempt,
    prompt: "The crew has one signal window before weather hides the coast. How will you try to reach a passing vessel?",
    options: methods.map(({ id, label, method, successWeight, successText }) => ({
      id,
      label,
      outcomes: [
        outcome(`${id}-success`, successText, { type: "signal-attempt", method, result: "success" }, successWeight),
        outcome(`${id}-failure`, "The signal fails to reach the vessel. The crew spends the window and has to pursue its remaining lead.", { type: "signal-attempt", method, result: "failure" }, 100 - successWeight, { health: -2, morale: -5 }),
      ],
    })),
  };
}

export function createCampaignDecision(state: { campaign: CampaignState; startingItemIds: string[] }): DecisionCard | null {
  switch (state.campaign.node) {
    case "shoreline-priority": return SHORELINE_PRIORITY_CARD;
    case "first-night": return createFirstNightCard(state.campaign);
    case "daybreak-survey": return createDaybreakSurveyCard();
    case "freshwater-run": return createFreshwaterRunCard(state.campaign);
    case "wildlife-encounter": return createWildlifeEncounterCard(state.campaign);
    case "medical-triage": return createMedicalTriageCard(state.startingItemIds);
    case "cave-expedition": return createCaveExpeditionCard(state.campaign);
    case "shelter-reinforcement": return createShelterReinforcementCard(state.campaign, state.startingItemIds);
    case "crew-council": return createCrewCouncilCard(state.campaign);
    case "storm-warning": return createStormWarningCard(state.campaign);
    case "escape-project": return createEscapeProjectCard(state.campaign);
    case "signal-preparation": return createSignalPreparationCard(state.campaign, state.startingItemIds);
    case "signal-approach": return createSignalApproachCard(state.startingItemIds);
    case "signal-window": return createSignalWindowCard(state.campaign);
    case "signal-attempt": return createSignalAttemptCard(state.campaign, !state.campaign.flareConsumed && state.startingItemIds.includes("flare"));
    case "coastal-expedition": return createCoastalExpeditionCard(state.campaign);
    case "coastal-hazard": return createCoastalHazardCard(state.campaign, state.startingItemIds);
    // Bear requires owned-item character state and is constructed by the state machine.
    case "bear-encounter":
    case "motorboat":
    case "complete": return null;
  }
}

export function nextCampaignNode(state: CampaignState, effect: NonNullable<Outcome["campaignEffect"]>): CampaignState {
  switch (effect.type) {
    case "shoreline":
      return { ...state, node: "first-night", radioRecovered: effect.choice === "salvage", shelterSecured: effect.choice === "shelter", coveLocated: effect.choice === "scout" };
    case "preparation":
      return { ...state, node: "daybreak-survey", radioRepaired: state.radioRepaired || effect.choice === "radio-repaired", lookoutSent: state.lookoutSent || effect.choice === "lookout", coveLocated: state.coveLocated || effect.choice === "lookout" };
    case "route-choice":
      return { ...state, node: effect.route === "signal" ? "signal-preparation" : "coastal-expedition" };
    case "signal-attempt":
      return { ...state, node: effect.result === "success" ? "complete" : "coastal-expedition", signalAttempted: true, signalFailed: effect.result === "failure", flareConsumed: state.flareConsumed || effect.method === "flare" };
    case "story-beat": {
      const flags = state.storyFlags ?? [];
      const storyFlags = effect.addFlag && !flags.includes(effect.addFlag) ? [...flags, effect.addFlag] : flags;
      return { ...state, node: effect.nextNode, storyFlags, ...(effect.signalPosition ? { signalPosition: effect.signalPosition } : {}), ...(effect.coveReached ? { coveReached: true } : {}) };
    }
  }
}
