import type { PublicGameSnapshot } from "../../shared/domain";

export interface IncidentPresentation {
  title: string;
  location: string;
  image: string;
  description: string;
}

const INCIDENTS: Record<string, Omit<IncidentPresentation, "description"> & { description: string }> = {
  "campaign-shoreline-priority": { title: "The tide is rising", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "The crew can recover the radio, protect the injured, or scout the coast before the light goes." },
  "campaign-first-night": { title: "One useful hour of daylight", location: "First camp", image: "/images/incidents/cliff-shelter.webp", description: "The crew's first choice has changed what can be repaired and how safely they can spend the night." },
  "campaign-daybreak-survey": { title: "Morning inventory", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "The tide has left debris above the waterline. The crew can search it, forage, or map the coast." },
  "campaign-freshwater-run": { title: "Thirst and bad directions", location: "Jungle stream", image: "/images/incidents/jungle-forage.webp", description: "The crew needs water before pushing farther inland." },
  "campaign-wildlife-encounter": { title: "Pantry inspection", location: "Forest camp", image: "/images/incidents/boar-encounter.webp", description: "A wild boar has reached the food pile and is treating it as a lease agreement." },
  "campaign-medical-triage": { title: "The morning after", location: "First camp", image: "/images/incidents/wreckage-lighter.webp", description: "Scrapes and bruises need attention before the crew travels again." },
  "campaign-cave-expedition": { title: "A cave with excellent acoustics", location: "Mountain foothills", image: "/images/incidents/cliff-shelter.webp", description: "A low cave may contain supplies, shelter, or a very loud echo." },
  "campaign-shelter-reinforcement": { title: "Keep the roof attached", location: "First camp", image: "/images/incidents/cliff-shelter.webp", description: "The crew can improve the shelter or keep material for an escape plan." },
  "campaign-crew-council": { title: "The meeting that might matter", location: "First camp", image: "/images/incidents/jungle-forage.webp", description: "The crew needs to agree on priorities before the weather turns." },
  "campaign-storm-warning": { title: "Weather has entered the chat", location: "Island ridge", image: "/images/incidents/cliff-shelter.webp", description: "Clouds are closing over the island. The crew has time for one final preparation." },
  "campaign-escape-project": { title: "Pick a way out", location: "Island coast", image: "/images/incidents/coastal-signal.webp", description: "The crew can try one signal opportunity or commit to searching for the motorboat." },
  "campaign-signal-preparation": { title: "Before the signal window", location: "High ridge", image: "/images/incidents/coastal-signal.webp", description: "The crew must prepare a signal and reach a useful position before the weather closes in." },
  "campaign-signal-approach": { title: "The ridge climb", location: "High ridge", image: "/images/incidents/coastal-signal.webp", description: "The crew needs a clear view of the shipping lane before the signal window opens." },
  "campaign-signal-window": { title: "A gap in the clouds", location: "High ridge", image: "/images/incidents/coastal-signal.webp", description: "A passing engine can be heard beyond the storm. The crew must decide whether to signal now or wait." },
  "campaign-signal-attempt": { title: "One signal window", location: "High ground", image: "/images/incidents/coastal-signal.webp", description: "The crew has one chance to reach a passing vessel before the weather closes in." },
  "campaign-bear-encounter": { title: "The bear blocks the trail", location: "Forest path", image: "/images/incidents/jungle-forage.webp", description: "A bear has reached the crew's food and blocks the path back to camp. The crew can give up supplies, distract it, or nominate an equipped hunter." },
  "camp-hunger-crisis": { title: "The hunger vote", location: "Camp", image: "/images/incidents/cliff-shelter.webp", description: "The crew is starving. A food search remains possible, but a terrible proposal is on the table." },
  "camp-night-hunger": { title: "While the camp sleeps", location: "Camp", image: "/images/incidents/cliff-shelter.webp", description: "Night falls over the hungry camp." },
  "campaign-coastal-expedition": { title: "The long way to the cove", location: "Rocky coast", image: "/images/incidents/motorboat-cove.webp", description: "The crew follows its remaining lead along a dangerous stretch of coast." },
  "campaign-coastal-hazard": { title: "The reef crossing", location: "Cove approach", image: "/images/incidents/motorboat-cove.webp", description: "The cove is close, but the way down is slick and the surf is rising." },
  "wreckage-lighter": { title: "The shifting wreck", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "The fuselage is settling into the tide. The crew has time to pull out one useful thing." },
  "coconut-jury": { title: "Gravity's committee", location: "Jungle clearing", image: "/images/incidents/jungle-forage.webp", description: "A heavy crop hangs over camp, and every plan seems to put somebody underneath it." },
  "smoke-signal": { title: "A shape on the horizon", location: "Rocky coast", image: "/images/incidents/coastal-signal.webp", description: "A distant vessel may be close enough to see a signal. The crew has to choose what to burn." },
  "mystery-berries": { title: "No label, no promises", location: "Jungle clearing", image: "/images/incidents/jungle-forage.webp", description: "Glossy berries have appeared beside camp. Nobody can identify them with confidence." },
  "shelter-politics": { title: "Weather moving in", location: "Forest crossroads", image: "/images/incidents/cliff-shelter.webp", description: "Clouds are building over the ridge. The crew needs a place that can last through the night." },
  "boar-diplomacy": { title: "Uninvited camp guest", location: "Forest crossroads", image: "/images/incidents/boar-encounter.webp", description: "A hungry boar has wandered into camp and is treating the food pile as a personal lease." },
  "rainwater-budget": { title: "Rain with conditions", location: "Waterfall pool", image: "/images/incidents/cliff-shelter.webp", description: "Rain is finally falling. The crew needs to catch clean water before the storm passes." },
  "distress-flare": { title: "One shot at being seen", location: "Rocky coast", image: "/images/incidents/coastal-signal.webp", description: "A flare could reach the horizon, but there is only one and the weather is turning." },
  "cave-of-bad-ideas": { title: "The humming entrance", location: "Mountain foothills", image: "/images/incidents/cliff-shelter.webp", description: "A low vibration comes from the cave. It could hide supplies, shelter, or a reason to leave." },
  "raft-committee": { title: "The raft is floating", location: "Rocky coast", image: "/images/incidents/coastal-signal.webp", description: "The crew has built something boat-shaped. The tide is offering a narrow window to test it." },
  "motorboat-discovery": { title: "A boat in the cove", location: "Sheltered cove", image: "/images/incidents/motorboat-cove.webp", description: "A damaged motorboat is wedged between the rocks. The crew starts checking what can be saved." },
  "motorboat-repair": { title: "Repair under pressure", location: "Boat repair site", image: "/images/incidents/motorboat-cove.webp", description: "The engine and hull need work before the boat can carry anyone out." },
  "motorboat-recovery": { title: "Parts run", location: "Boat repair site", image: "/images/incidents/motorboat-cove.webp", description: "The repair needs more parts. The crew has to decide who will go looking." },
  "motorboat-group-launch": { title: "The tide is turning", location: "Launch cove", image: "/images/incidents/motorboat-cove.webp", description: "The boat may be ready to launch. The crew must choose whether to risk the crossing now." },
};

const OUTCOME_SCENES: Record<string, string> = {
  "cover-secured": "/images/incidents/shelter-secured.jpg",
  "shelter-politics-option-2-outcome-1": "/images/incidents/shelter-secured.jpg",
  "radio-burst-failure": "/images/incidents/signal-failure.jpg",
  "fire-flare-failure": "/images/incidents/signal-failure.jpg",
  "smoke-beacon-failure": "/images/incidents/signal-failure.jpg",
};

const FAILED_BOAT_CHANGES = new Set(["launch-failed", "solo-launch-failed", "storm-destroyed"]);

const fallback: IncidentPresentation = {
  title: "The island is waiting",
  location: "Crash beach",
  image: "/images/crash-shore.png",
  description: "The crew takes stock of the island and decides what to do next.",
};

const crashScenes: Partial<Record<PublicGameSnapshot["phase"], IncidentPresentation>> = {
  intro: { title: "Impact report", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "The aircraft has come to rest at the waterline. The crew gathers itself and prepares to choose what matters first." },
  crashItemChoice: { title: "One thing from the wreck", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "A few useful things remain within reach. Choose what your character carries away from the wreck." },
  crashRescueChoice: { title: "Someone is still inside", location: "Broken fuselage", image: "/images/incidents/wreckage-lighter.webp", description: "The cabin is filling with water. Choose who your character will try to pull clear." },
  crashResolution: { title: "Rescue report", location: "Crash beach", image: "/images/incidents/wreckage-lighter.webp", description: "The crew sees who made it out of the aircraft." },
};

export function getIncidentPresentation(snapshot: PublicGameSnapshot, options: { keepDecisionScene?: boolean } = {}): IncidentPresentation {
  if (snapshot.phase in crashScenes) {
    const scene = crashScenes[snapshot.phase]!;
    return snapshot.phase === "crashResolution" && snapshot.crashResolution
      ? { ...scene, description: snapshot.crashResolution.summary }
      : scene;
  }
  if (snapshot.phase === "ending") {
    const result = snapshot.escapeResult;
    const title = snapshot.endingId === "no-survivors" ? "No survivors" : snapshot.endingId === "solo-escape" ? "One made it out" : snapshot.endingId === "signal-rescue" ? "The signal was seen" : "The escape report";
    const description = result
      ? `${result.escapedCharacterIds.length} escaped · ${result.strandedCharacterIds.length} stranded · ${result.deadCharacterIds.length} lost.`
      : "The island's final report is being recorded.";
    const image = snapshot.endingId === "signal-rescue"
      ? "/images/incidents/signal-rescue.jpg"
      : snapshot.motorboat?.node === "terminal"
        ? "/images/incidents/motorboat-storm.jpg"
        : snapshot.endingId === "group-escape" || snapshot.endingId === "solo-escape"
          ? "/images/incidents/motorboat-escape.jpg"
        : "/images/incidents/coastal-signal.webp";
    return { title, location: "End of flight", image, description };
  }
  const event = snapshot.eventHistory.at(-1);
  let incidentId = snapshot.phase === "reveal"
    ? event?.decisionId
    : snapshot.currentDecision?.id ?? snapshot.activeAssignment?.decisionId;
  if (!incidentId && snapshot.activePrivateChoice?.kind === "night-hunger") incidentId = "camp-night-hunger";
  if (!incidentId && snapshot.activePrivateChoice?.kind === "fuel-discovery") incidentId = "motorboat-discovery";
  if (!incidentId && snapshot.activePrivateChoice?.kind === "launch-custodian") incidentId = "motorboat-group-launch";
  const incident = incidentId ? INCIDENTS[incidentId] : undefined;
  if (!incident) return fallback;

  const isResolved = snapshot.phase === "reveal" && event?.decisionId === incidentId;
  const outcomeId = event?.resolution?.outcomeId ?? event?.outcomeId;
  const motorboatFacts = event?.resolution?.motorboat ?? event?.motorboat;
  const resolvedImage = outcomeId ? OUTCOME_SCENES[outcomeId] : undefined;
  const boatChangeImage = motorboatFacts?.boatChange && FAILED_BOAT_CHANGES.has(motorboatFacts.boatChange)
    ? "/images/incidents/motorboat-storm.jpg"
    : undefined;
  const campaign = snapshot.campaign;
  const contextualDescription = incidentId === "campaign-first-night" && campaign
    ? campaign.radioRecovered
      ? "The radio battery survived the wreck. The crew must decide whether to repair it, rest, or send a lookout."
      : campaign.shelterSecured
        ? "The crew has cover for the night. They can rest, scout higher ground, and prepare an escape plan."
        : "The crew has no protected camp yet. Rest is rough, and a lookout means spending another survivor's strength."
    : incidentId === "campaign-daybreak-survey" && campaign
      ? campaign.storyFlags?.includes("wreck-supplies")
        ? "The crew recovered supplies from the fuselage and can now search for water before choosing its next route."
        : campaign.shelterSecured
          ? "The crew has cover for the morning, but still needs food, water, and a route through the island."
          : "The crew made it through the night in the open. The tide has left a few things worth searching for."
      : incidentId === "campaign-freshwater-run" && campaign
        ? "The crew is thirsty and needs to collect or locate clean water before traveling."
        : incidentId === "campaign-wildlife-encounter" && campaign
          ? "A wild boar is at the food pile. The crew can distract it, drive it away, or retreat together."
          : incidentId === "campaign-signal-window" && campaign
            ? campaign.signalPosition === "ridge"
              ? "From the ridge, the crew can see a break in the clouds and choose when to use the signal."
              : "From the lower path, the canopy hides the horizon. The crew can use this opening or wait for a clearer one."
            : incidentId === "campaign-escape-project" && campaign
      ? campaign.coveLocated
        ? "The scout marked the cove. The crew can pursue the boat or spend its signal opportunity."
        : campaign.radioRepaired
          ? "The repaired radio gives the crew a strong signal option. Searching the coast for the boat remains possible."
          : "The crew can build an improvised signal or search the coast for the boat. Earlier supplies and route knowledge affect what is available."
      : incidentId === "campaign-signal-attempt" && campaign
        ? campaign.radioRepaired
          ? campaign.signalPosition === "ridge"
            ? "The repaired radio is ready for one transmission from the ridge."
            : "The repaired radio is ready for one transmission from the lower coast."
          : "The crew has one chance with a flare or smoky beacon before weather hides the coast."
        : incidentId === "motorboat-discovery" && campaign?.signalFailed
          ? campaign.coveReached
            ? "The signal went unanswered, but the crew reached the cove. They begin inspecting the boat."
            : "The signal went unanswered. The crew follows the coastline toward its remaining escape lead."
        : incidentId === "motorboat-discovery" && campaign?.coveReached
          ? "The crew reaches the cove and begins inspecting the boat."
        : incidentId === "motorboat-discovery" && campaign?.coveLocated
          ? "The scout's tide marks lead the crew straight to the sheltered cove and a safer approach to the boat."
          : incident.description;
  const description = isResolved && !options.keepDecisionScene
    ? event?.resolution?.outcomeText ?? event?.text ?? incident.description
    : contextualDescription;
  return { ...incident, image: isResolved && !options.keepDecisionScene ? resolvedImage ?? boatChangeImage ?? incident.image : incident.image, description };
}
