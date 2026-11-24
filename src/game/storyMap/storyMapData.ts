import { createBearEncounterCard } from "../../shared/content/bearEncounter";
import type { CampaignState, DecisionCard, DecisionOption, Outcome } from "../../shared/domain";
import { DECISION_CARDS } from "../../shared/content/decisionCards";
import {
  SHORELINE_PRIORITY_CARD,
  createCaveExpeditionCard,
  createCoastalExpeditionCard,
  createCoastalHazardCard,
  createCrewCouncilCard,
  createDaybreakSurveyCard,
  createEscapeProjectCard,
  createFirstNightCard,
  createFreshwaterRunCard,
  createMedicalTriageCard,
  createShelterReinforcementCard,
  createSignalApproachCard,
  createSignalPreparationCard,
  createSignalWindowCard,
  createSignalAttemptCard,
  createStormWarningCard,
  createWildlifeEncounterCard,
  nextCampaignNode,
} from "../../shared/content/campaignRoute";
import {
  createMotorboatDiscoveryCard,
  createMotorboatGroupLaunchCard,
  createMotorboatRepairCard,
} from "../../shared/content/motorboatRoute";
import { initialCampaignState } from "../../shared/rules/stateMachine";
import { initialMotorboatRoute } from "../../shared/rules/motorboat";

export type MapMode = "route" | "encounters" | "mechanics";
export type MapNodeKind = "decision" | "option" | "outcome" | "state" | "mechanic" | "ending";

export interface StoryMapNodeData extends Record<string, unknown> {
  kind: MapNodeKind;
  title: string;
  subtitle?: string;
  details: string[];
  source?: string;
  tags?: string[];
}

export interface StoryMapNodeSpec {
  id: string;
  data: StoryMapNodeData;
}

export interface StoryMapEdgeSpec {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StoryMapGraph {
  nodes: StoryMapNodeSpec[];
  edges: StoryMapEdgeSpec[];
}

interface MechanicSpec extends StoryMapNodeSpec {
  id: `mechanic:${string}`;
}

interface DecisionCase {
  id: string;
  card: DecisionCard;
  title: string;
  context: string;
  campaign?: CampaignState;
  startingItemIds?: string[];
}

const initialCampaign = initialCampaignState();
const initialBoat = initialMotorboatRoute();

function campaignCases(): DecisionCase[] {
  const radio = { ...initialCampaign, node: "first-night" as const, radioRecovered: true, shelterSecured: false };
  const shelter = { ...initialCampaign, node: "first-night" as const, radioRecovered: false, shelterSecured: true };
  const scout = { ...initialCampaign, node: "first-night" as const, radioRecovered: false, shelterSecured: false, coveLocated: true };
  const escape = (id: string, title: string, state: typeof initialCampaign, context: string) => ({
    id, title, context,
    card: createEscapeProjectCard({ ...state, node: "escape-project" }),
  });
  return [
    { id: "shoreline", card: SHORELINE_PRIORITY_CARD, title: "Shoreline priority", context: "Opening decision. Salvage unlocks radio repair; shelter changes rest results; scouting reveals the cove route." },
    { id: "first-night-radio", card: createFirstNightCard(radio), title: "First night · radio recovered", context: "Radio repair is available. Shelter was not secured, so resting happens in the open." },
    { id: "first-night-shelter", card: createFirstNightCard(shelter), title: "First night · shelter secured", context: "No wreck radio was recovered, so the crew cannot repair it. Resting benefits from shelter." },
    { id: "first-night-scout", card: createFirstNightCard(scout), title: "First night · cove discovered", context: "The scout found the cove; no radio or shelter has been secured." },
    { id: "daybreak-survey", card: createDaybreakSurveyCard(), title: "Daybreak survey", context: "The crew searches wreckage, forages, or marks a coast route before the inland survival decisions." },
    { id: "freshwater-run", card: createFreshwaterRunCard({ ...initialCampaign, storyFlags: ["wreck-supplies"] }), title: "Freshwater run · bottles recovered", context: "The bottles recovered from the fuselage change the scene prompt; water outcomes are recorded in resources." },
    { id: "wildlife-encounter", card: createWildlifeEncounterCard(initialCampaign), title: "Wildlife at camp", context: "The boar scene follows the freshwater run; food and morale consequences depend on the chosen response." },
    { id: "medical-triage", card: createMedicalTriageCard(["first-aid-kit"]), title: "Medical triage · first-aid kit", context: "The first-aid option appears only when a living survivor carries a first-aid kit." },
    { id: "cave-expedition", card: createCaveExpeditionCard({ ...initialCampaign, storyFlags: ["freshwater-found"] }), title: "Cave expedition · spring trail", context: "Freshwater discovery changes the cave approach; exploration may provide supplies or cause injury." },
    { id: "bear-encounter", card: createBearEncounterCard({ characters: Object.fromEntries(["knife", "improvised-bow"].map((startingItemId,i) => [String(i),{characterId:String(i),status:"alive",startingItemId,resources:{food:50,health:100,morale:65,water:50}}])) }), title: "Bear encounter · equipped hunters", context: "Only a living owner of the selected weapon can be nominated. Refusal can trigger retreat; injuries affect the hunter." },
    { id: "shelter-reinforcement", card: createShelterReinforcementCard({ ...initialCampaign, storyFlags: ["wreck-supplies", "cave-supplies"] }, ["rope"]), title: "Shelter reinforcement · salvage available", context: "Salvaged wreck/cave materials and a carried rope unlock additional reinforcement choices." },
    { id: "crew-council", card: createCrewCouncilCard({ ...initialCampaign, storyFlags: ["boar-driven-off"] }), title: "Crew council · boar driven off", context: "The council prompt reflects the earlier camp incident and its resolution." },
    { id: "storm-warning", card: createStormWarningCard({ ...initialCampaign, storyFlags: ["shelter-reinforced"] }), title: "Storm warning · shelter reinforced", context: "The last preparation can protect the crew, stage signal supplies, or mark the route to the cove." },
    escape("escape-radio", "Escape plan · repaired radio", { ...initialCampaign, radioRepaired: true }, "Signal route uses the repaired radio; motorboat remains an alternative."),
    escape("escape-no-radio", "Escape plan · no repaired radio", initialCampaign, "Signal route uses a flare when available or a smoky beacon; motorboat remains an alternative."),
    escape("escape-no-radio-scouted", "Escape plan · lookout found the cove", { ...initialCampaign, coveLocated: true, lookoutSent: true }, "No radio is repaired, but the lookout has marked a safer route to the cove."),
    { id: "signal-preparation-radio", card: createSignalPreparationCard({ ...initialCampaign, node: "signal-preparation", radioRepaired: true }, ["flare"]), title: "Signal preparation · repaired radio", context: "The repaired radio is available; the crew prepares a backup signal before choosing position.", campaign: { ...initialCampaign, node: "signal-preparation", radioRepaired: true }, startingItemIds: ["flare"] },
    { id: "signal-preparation-improvised", card: createSignalPreparationCard({ ...initialCampaign, node: "signal-preparation" }, ["flare"]), title: "Signal preparation · no repaired radio", context: "The crew prepares a flare or smoky beacon before choosing position.", campaign: { ...initialCampaign, node: "signal-preparation" }, startingItemIds: ["flare"] },
    ...(["radio", "improvised"] as const).flatMap((route) => (["kit", "bare"] as const).map((preparation) => ({
      id: `signal-approach-${route}-${preparation}`,
      card: createSignalApproachCard([]),
      title: `Signal approach · ${route === "radio" ? "repaired radio" : "improvised signal"} · ${preparation === "kit" ? "kit ready" : "basic kit"}`,
      context: `This route preserves the ${preparation === "kit" ? "prepared signal kit" : "unprepared signal kit"} while the crew chooses its approach.`,
      campaign: { ...initialCampaign, node: "signal-approach", radioRepaired: route === "radio", storyFlags: preparation === "kit" ? ["signal-kit-prepared"] : [] },
    }))),
    ...(["radio", "improvised"] as const).flatMap((route) => (["kit", "bare"] as const).flatMap((preparation) => (["ridge", "low"] as const).map((position) => {
      const storyFlags = [
        ...(preparation === "kit" ? ["signal-kit-prepared" as const] : []),
        ...(position === "ridge" ? ["coast-route-marked" as const] : []),
      ];
      const campaign = { ...initialCampaign, node: "signal-window" as const, radioRepaired: route === "radio", signalPosition: position, storyFlags };
      return { id: `signal-window-${route}-${preparation}-${position}`, card: createSignalWindowCard(campaign), title: `Signal window · ${route} · ${preparation} · ${position}`, context: `The scene carries forward ${storyFlags.length ? storyFlags.join(" and ") : "no signal preparation flags"}.`, campaign };
    }))),
    ...(["radio", "improvised"] as const).flatMap((route) => (["kit", "bare"] as const).flatMap((preparation) => (["ridge", "low"] as const).flatMap((position) => (["clear", "storm"] as const).map((weather) => {
      const storyFlags = [
        ...(preparation === "kit" ? ["signal-kit-prepared" as const] : []),
        ...(weather === "clear" ? ["clear-signal-window" as const] : ["storm-gust" as const]),
      ];
      const campaign = { ...initialCampaign, node: "signal-attempt" as const, radioRepaired: route === "radio", signalPosition: position, storyFlags };
      const hasFlare = route === "improvised" && preparation === "kit";
      return { id: `signal-attempt-${route}-${preparation}-${position}-${weather}`, card: createSignalAttemptCard(campaign, hasFlare), title: `Signal attempt · ${route} · ${preparation} · ${position} · ${weather}`, context: `Authored method weights reflect ${storyFlags.join(", ") || "no preparation or weather flags"} and ${position} position. Signal failure proceeds to the coast route.`, campaign };
    })))),
    { id: "coastal-expedition", card: createCoastalExpeditionCard({ ...initialCampaign, node: "coastal-expedition", signalFailed: true }), title: "Coastal expedition · signal failed", context: "The signal failure redirects the crew to its remaining escape lead along the coast." },
    { id: "coastal-hazard-scouted", card: createCoastalHazardCard({ ...initialCampaign, node: "coastal-hazard", coveLocated: true, storyFlags: ["coast-route-marked"] }, ["rope"]), title: "Coastal hazard · scout marks known", context: "The crew knows the cove route and carries a rope; the map retains that early-scout advantage.", campaign: { ...initialCampaign, node: "coastal-hazard", coveLocated: true, storyFlags: ["coast-route-marked"] }, startingItemIds: ["rope"] },
    { id: "coastal-hazard-unscouted", card: createCoastalHazardCard({ ...initialCampaign, node: "coastal-hazard" }, []), title: "Coastal hazard · no prior scout", context: "The crew reaches the cove route without an early scout or rope.", campaign: { ...initialCampaign, node: "coastal-hazard" } },
  ];
}

function boatCases(): DecisionCase[] {
  const base = { ...initialBoat, node: "repair" as const, discovered: true, hull: "sound" as const, engine: "broken" as const, fuelCharges: 2 as const, fuelVisibility: "shared" as const };
  const recovery = { ...base, repairParts: true, engineDiagnosed: true };
  return [
    { id: "boat-discovery-unscouted", card: createMotorboatDiscoveryCard({ ...initialCampaign }), title: "Boat discovery · unscouted coast", context: "No cove clue is known; the scout tide-mark option is absent." },
    { id: "boat-discovery-scouted", card: createMotorboatDiscoveryCard({ ...initialCampaign, coveLocated: true }), title: "Boat discovery · scout marks known", context: "Cove was found earlier, adding the safe tide-mark option." },
    { id: "boat-repair-parts", card: createMotorboatRepairCard({ ...base, repairParts: true, engineDiagnosed: true }, 0, []), title: "Boat repair · parts and diagnosis", context: "Salvaged parts and a diagnosed engine unlock the careful patch option. No shelter braces are modeled." },
    { id: "boat-repair-tool", card: createMotorboatRepairCard({ ...base, repairParts: false, engineDiagnosed: true }, 0, ["knife"]), title: "Boat repair · diagnosed fault and knife", context: "No salvage parts, but the engine was diagnosed and a knife is available, unlocking a careful repair." },
    { id: "boat-repair-braces", card: createMotorboatRepairCard({ ...base, repairParts: false, engineDiagnosed: false }, 20, []), title: "Boat repair · shelter braces", context: "No parts or diagnosis; the crew can sacrifice 15 shelter to brace the repair." },
    { id: "boat-repair-force", card: createMotorboatRepairCard({ ...base, repairParts: false, engineDiagnosed: false }, 0, []), title: "Boat repair · no salvage parts", context: "No repair parts, diagnosis, tools, or usable shelter braces; forcing the starter remains available." },
    { id: "boat-recovery-one-miss", card: createMotorboatRepairCard({ ...recovery, warningLevel: 1, missedOpportunityIds: ["map-miss-1"] }, 0, []), title: "Recovery · one missed launch", context: "The storm warning has advanced once. This card uses the existing recovery repair rules." },
    { id: "boat-recovery-two-misses", card: createMotorboatRepairCard({ ...recovery, warningLevel: 2, missedOpportunityIds: ["map-miss-1", "map-miss-2"] }, 0, []), title: "Recovery · two missed launches", context: "Two opportunities have been missed; another valid miss can trigger the storm ending." },
    ...(["sturdy", "fragile"] as const).flatMap((engine) => [0, 1, 2].map((misses) => {
      const missedOpportunityIds = Array.from({ length: misses }, (_, index) => `map-miss-${index + 1}`);
      const missSuffix = misses === 0 ? "first" : misses === 1 ? "one-miss" : "two-misses";
      const id = `boat-launch-${engine}-${missSuffix}`;
      const chance = Math.max(5, (engine === "sturdy" ? 80 : 60) - misses * 10);
      return {
        id,
        card: createMotorboatGroupLaunchCard({ ...base, node: "launch", engine, missedOpportunityIds }),
        title: `Group launch · ${engine} engine · ${misses} prior ${misses === 1 ? "miss" : "misses"}`,
        context: `${engine === "sturdy" ? "Sturdy" : "Fragile"} engine with ${misses} prior missed opportunities: ${chance}% success weight. A failure or another valid wait ${misses === 2 ? "ends in the storm" : "advances recovery"}.`,
      };
    })),
  ];
}

function mergeCards(cards: DecisionCard[]): DecisionCard[] {
  const merged = new Map<string, DecisionCard>();
  for (const card of cards) {
    const current = merged.get(card.id) ?? { ...card, options: [] };
    const options = new Map(current.options.map((option) => [option.id, option]));
    for (const option of card.options) {
      const previous = options.get(option.id);
      const outcomes = new Map((previous?.outcomes ?? []).map((outcome) => [outcome.id, outcome]));
      for (const outcome of option.outcomes) outcomes.set(outcome.id, outcome);
      options.set(option.id, { ...previous, ...option, outcomes: [...outcomes.values()] });
    }
    merged.set(card.id, { ...current, ...card, options: [...options.values()] });
  }
  return [...merged.values()];
}

function formatDeltas(outcome: Outcome): string[] {
  return Object.entries(outcome.resourceDeltas ?? {}).map(([key, value]) => `${key}: ${value! > 0 ? "+" : ""}${value}`);
}

function outcomeTags(outcome: Outcome): string[] {
  return [
    ...(outcome.campaignEffect ? ["campaign route"] : []),
    ...(outcome.motorboatEffect ? ["motorboat route"] : []),
    ...(outcome.effectTarget === "assigned-actor" ? ["assigned character"] : []),
    ...(outcome.eliminateRandomLiving || outcome.eliminateCharacterId ? ["possible death"] : []),
  ];
}

const endingDetails: Record<string, string[]> = {
  "ending:signal-rescue": ["Ending: rescued by signal", "Reached by successful signal attempt."],
  "ending:group-escape": ["Ending: crew boat escape", "All living passengers escape together."],
  "ending:solo-escape": ["Ending: solo escape", "A custodian escapes alone; remaining survivors are stranded."],
  "ending:no-survivors": ["Ending: no survivors", "Reached when all characters die or the third valid boat opportunity is missed."],
};

function routeTarget(decisionCase: DecisionCase, outcome: Outcome): { id: string; label?: string } | undefined {
  const campaign = outcome.campaignEffect;
  if (campaign?.type === "shoreline") {
    const target = campaign.choice === "salvage" ? "first-night-radio" : campaign.choice === "shelter" ? "first-night-shelter" : "first-night-scout";
    return { id: `decision:${target}`, label: "Next: first night" };
  }
  if (campaign?.type === "preparation") {
    return { id: "decision:daybreak-survey", label: "Next: morning survey" };
  }
  if (campaign?.type === "route-choice") return campaign.route === "signal"
    ? { id: `decision:${decisionCase.id === "escape-radio" ? "signal-preparation-radio" : "signal-preparation-improvised"}`, label: "Prepare signal" }
    : { id: "decision:coastal-expedition", label: "Search/return to boat" };
  if (campaign?.type === "signal-attempt") return campaign.result === "success"
    ? { id: "ending:signal-rescue", label: "Signal succeeds" }
    : { id: "decision:coastal-expedition", label: "Signal fails; search for boat" };

  if (campaign?.type === "story-beat") {
    const nextCampaign = nextCampaignNode(decisionCase.campaign ?? initialCampaign, campaign);
    if (campaign.nextNode === "signal-approach") {
      const route = nextCampaign.radioRepaired ? "radio" : "improvised";
      const preparation = nextCampaign.storyFlags.includes("signal-kit-prepared") ? "kit" : "bare";
      const target = `signal-approach-${route}-${preparation}`;
      return { id: `decision:${target}`, label: "Climb to a signal position" };
    }
    if (campaign.nextNode === "signal-window") {
      const route = decisionCase.id.includes("signal-approach-radio") ? "radio" : "improvised";
      const preparation = decisionCase.id.endsWith("-kit") ? "kit" : "bare";
      return { id: `decision:signal-window-${route}-${preparation}-${nextCampaign.signalPosition}`, label: "Choose the signal window" };
    }
    if (campaign.nextNode === "signal-attempt") {
      const route = decisionCase.id.includes("signal-window-radio") ? "radio" : "improvised";
      const preparation = nextCampaign.storyFlags.includes("signal-kit-prepared") ? "kit" : "bare";
      const position = nextCampaign.signalPosition;
      const clear = nextCampaign.storyFlags.includes("clear-signal-window");
      const target = `signal-attempt-${route}-${preparation}-${position}-${clear ? "clear" : "storm"}`;
      return { id: `decision:${target}`, label: "Attempt rescue signal" };
    }
    const targets: Partial<Record<CampaignState["node"], string>> = {
      "freshwater-run": "freshwater-run",
      "wildlife-encounter": "wildlife-encounter",
      "medical-triage": "medical-triage",
      "cave-expedition": "cave-expedition",
      "bear-encounter": "bear-encounter",
      "shelter-reinforcement": "shelter-reinforcement",
      "crew-council": "crew-council",
      "storm-warning": "storm-warning",
      "escape-project": "escape-project",
      "motorboat": nextCampaignNode(decisionCase.campaign ?? initialCampaign, campaign).coveLocated ? "boat-discovery-scouted" : "boat-discovery-unscouted",
    };
      const target = campaign.nextNode === "escape-project" ? "escape-project"
        : campaign.nextNode === "coastal-hazard" ? `coastal-hazard-${decisionCase.campaign?.coveLocated ? "scouted" : "unscouted"}`
          : targets[campaign.nextNode];
    if (target) return { id: `decision:${target}`, label: "Next story decision" };
  }

  const boat = outcome.motorboatEffect;
  if (boat?.type === "discovery") return { id: "state:fuel-custody", label: "Fuel found" };
  if (boat?.type === "repair") {
    const suffix = decisionCase.id === "boat-recovery-two-misses" ? "two-misses" : decisionCase.id === "boat-recovery-one-miss" ? "one-miss" : "first";
    return { id: `state:launch-custodian-${suffix}`, label: "Repair complete" };
  }
  if (boat?.type === "launch" && boat.result === "success") return { id: "ending:group-escape", label: "Launch succeeds" };
  if (boat?.type === "launch" || boat?.type === "miss") {
    const misses = decisionCase.id.endsWith("two-misses") ? 2 : decisionCase.id.endsWith("one-miss") ? 1 : 0;
    if (misses === 2) return { id: "ending:no-survivors", label: "Third miss; storm ending" };
    return { id: `decision:boat-recovery-${misses === 1 ? "two-misses" : "one-miss"}`, label: boat.type === "launch" ? "Launch fails; recover" : "Opportunity missed" };
  }
  return undefined;
}

function buildCardGraph(cases: DecisionCase[], mode: "route" | "encounters"): StoryMapGraph {
  const nodes: StoryMapNodeSpec[] = [];
  const edges: StoryMapEdgeSpec[] = [];
  const routeIds = new Set(cases.map(({ id }) => id));
  const endingIds = new Set<string>();
  for (const decisionCase of cases) {
    const { card } = decisionCase;
    const isRoute = card.id.startsWith("campaign-") || card.id.startsWith("motorboat-");
    const decisionId = `decision:${decisionCase.id}`;
    nodes.push({ id: decisionId, data: { kind: "decision", title: decisionCase.title, subtitle: card.prompt, details: [card.prompt, `${card.options.length} options`, decisionCase.context, isRoute ? "Authored route decision" : "Encounter card"], source: card.id, tags: [isRoute ? "route" : "encounter"] } });
    for (const option of card.options) {
      const optionId = `option:${decisionCase.id}:${option.id}`;
      const totalWeight = option.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
      nodes.push({ id: optionId, data: { kind: "option", title: option.label, subtitle: option.assignment ? `Assignment · ${option.assignment.roleLabel}` : "Player choice", details: [option.label, ...(option.assignment ? [`Group nominates an eligible living character to ${option.assignment.roleLabel}.`, `Refusal chance: ${option.assignment.refusal.successChanceBps / 100}% (${option.assignment.refusal.qualitativeRisk}).`] : []), `Possible outcomes: ${option.outcomes.length}`], source: option.id, tags: ["choice", ...(option.assignment ? ["assignment"] : [])] } });
      edges.push({ id: `edge:${decisionId}:${optionId}`, source: decisionId, target: optionId });
      for (const outcome of option.outcomes) {
        const outcomeId = `outcome:${decisionCase.id}:${outcome.id}`;
        const deltas = formatDeltas(outcome);
        const chance = totalWeight > 0 ? outcome.weight / totalWeight * 100 : 0;
        const chanceLabel = `${Number.isInteger(chance) ? chance : chance.toFixed(1)}%`;
        nodes.push({ id: outcomeId, data: { kind: "outcome", title: outcome.text, subtitle: `${chanceLabel} chance · weight ${outcome.weight}`, details: [outcome.text, `Chance within this choice: ${chanceLabel} (authored weight ${outcome.weight} of ${totalWeight}).`, ...(deltas.length ? [`Resource changes: ${deltas.join(", ")}`] : []), ...(outcome.eliminateRandomLiving ? ["May eliminate a random living character."] : []), ...(outcome.campaignEffect ? [`Campaign effect: ${JSON.stringify(outcome.campaignEffect)}`] : []), ...(outcome.motorboatEffect ? [`Motorboat effect: ${JSON.stringify(outcome.motorboatEffect)}`] : [])], source: outcome.id, tags: outcomeTags(outcome) } });
        edges.push({ id: `edge:${optionId}:${outcomeId}`, source: optionId, target: outcomeId, label: chanceLabel });
        if (mode === "route") {
          const target = routeTarget(decisionCase, outcome);
          if (target) {
            const isEnding = target.id.startsWith("ending:");
            if (isEnding) endingIds.add(target.id);
            edges.push({ id: `edge:${outcomeId}:${target.id}`, source: outcomeId, target: target.id, label: target.label });
          } else if (!isRoute) {
            edges.push({ id: `edge:${outcomeId}:mechanic:survival`, source: outcomeId, target: "mechanic:survival", label: "Then apply survival" });
          }
          if (outcome.eliminateRandomLiving || outcome.eliminateCharacterId) {
            edges.push({ id: `edge:${outcomeId}:ending:no-survivors`, source: outcomeId, target: "ending:no-survivors", label: "If nobody survives" });
          }
        } else {
          edges.push({ id: `edge:${outcomeId}:mechanic:survival`, source: outcomeId, target: "mechanic:survival", label: "Apply outcome + survival" });
        }
      }
    }
  }
  if (mode === "route") {
    endingIds.add("ending:signal-rescue");
    endingIds.add("ending:group-escape");
    endingIds.add("ending:solo-escape");
    endingIds.add("ending:no-survivors");
    const states: StoryMapNodeSpec[] = [
      { id: "state:hunger", data: { kind: "state", title: "Optional hunger crisis", details: ["At eligible camp boundaries, at least half the living crew must be starving.", "Vote to search or nominate a victim. One crisis per day; two per session.", "Resolve once, then resume the same normal route without another food tick."] } },
      { id: "state:night-hunger", data: { kind: "state", title: "Optional private night", details: ["One eligible hungry actor chooses Sleep or an attempted attack.", "Hunger increases offer chance; timeout sleeps. Attempts become public.", "No extra day tick or missed boat opportunity."] } },
      { id: "state:crash-choice", data: { kind: "state", title: "Crash choices", subtitle: "Select an item · choose whom to rescue", details: ["Each player receives three random survival item options.", "Players select an item and choose a rescue target.", "Rescue attempts resolve together; either, both, or neither character can survive."], source: "src/shared/rules/itemOffers.ts · src/shared/rules/crashRescue.ts", tags: ["start", "random", "survival"] } },
      { id: "decision:escape-project", data: { kind: "decision", title: "Escape project dispatch", subtitle: "State-dependent cases; not a separate vote", details: ["The server reaches one escape-project card after the storm scene.", "The map expands its available choices into representative cases for radio and cove knowledge.", "This node is a visualization junction, not an additional campaign decision."], source: "src/shared/content/campaignRoute.ts · createEscapeProjectCard", tags: ["state dispatch", "route"] } },
      { id: "state:fuel-custody", data: { kind: "state", title: "Private fuel choice", subtitle: "Share · hide · transfer", details: ["A private custodian chooses whether to share, keep, or transfer the discovered fuel.", "Timeout defaults to sharing.", "If the private owner dies, fuel returns to shared custody."], source: "src/shared/rules/stateMachine.ts · resolvePendingPrivateChoice", tags: ["private choice", "timeout"] } },
      ...(["first", "one-miss", "two-misses"] as const).map((missState) => ({ id: `state:launch-custodian-${missState}`, data: { kind: "state" as const, title: "Launch custodian choice", subtitle: missState === "first" ? "No prior misses" : `${missState === "one-miss" ? "One" : "Two"} prior missed opportunities`, details: ["Waking the crew opens the group launch vote.", "Solo launch may escape alone or fail and cause injury/missed opportunity.", "Quiet miss is available only to private fuel holder.", "Timeout defaults to waking the crew."], source: "src/shared/rules/stateMachine.ts · resolvePendingPrivateChoice", tags: ["private choice", "timeout", "selfish choice"] } })),
      ...[...endingIds].map((id) => ({ id, data: { kind: "ending" as const, title: endingDetails[id]?.[0] ?? id, subtitle: "Terminal state", details: endingDetails[id] ?? [], source: "src/shared/rules/stateMachine.ts", tags: ["ending"] } })),
    ];
    nodes.push(...states);
    const stateEdges: StoryMapEdgeSpec[] = [
      ...["first-night-radio", "first-night-shelter", "daybreak-survey", "shelter-reinforcement", "crew-council", "storm-warning"].filter(id=>routeIds.has(id)).flatMap(id => [
        { id: `hunger-from-${id}`, source: `decision:${id}`, target: "state:hunger", label: "Before decision, only if starving" },
        { id: `hunger-return-${id}`, source: "state:hunger", target: `decision:${id}`, label: "Resume original node" },
        { id: `night-from-${id}`, source: `decision:${id}`, target: "state:night-hunger", label: "Due camp night; optional" },
        { id: `night-return-${id}`, source: "state:night-hunger", target: `decision:${id}`, label: "Resume original node" },
      ]),
      { id: "edge:crash:shoreline", source: "state:crash-choice", target: "decision:shoreline", label: "Survivors continue" },
      { id: "edge:escape:radio-case", source: "decision:escape-project", target: "decision:escape-radio", label: "Radio repaired" },
      { id: "edge:escape:no-radio-case", source: "decision:escape-project", target: "decision:escape-no-radio", label: "No repaired radio" },
      { id: "edge:escape:scouted-case", source: "decision:escape-project", target: "decision:escape-no-radio-scouted", label: "No radio · cove scouted" },
      { id: "edge:crash:no-survivors", source: "state:crash-choice", target: "ending:no-survivors", label: "No survivors" },
      { id: "edge:fuel:repair-parts", source: "state:fuel-custody", target: "decision:boat-repair-parts", label: "Parts / diagnosis" },
      { id: "edge:fuel:repair-tool", source: "state:fuel-custody", target: "decision:boat-repair-tool", label: "Diagnosed + knife" },
      { id: "edge:fuel:repair-braces", source: "state:fuel-custody", target: "decision:boat-repair-braces", label: "Shelter available" },
      { id: "edge:fuel:repair-force", source: "state:fuel-custody", target: "decision:boat-repair-force", label: "No salvage" },
      ...(["first", "one-miss", "two-misses"] as const).flatMap((missState) => {
        const launchSuffix = missState;
        return [
          { id: `edge:launch:${missState}:sturdy`, source: `state:launch-custodian-${missState}`, target: `decision:boat-launch-sturdy-${launchSuffix}`, label: "Sturdy engine" },
          { id: `edge:launch:${missState}:fragile`, source: `state:launch-custodian-${missState}`, target: `decision:boat-launch-fragile-${launchSuffix}`, label: "Fragile engine" },
          { id: `edge:launch:${missState}:solo-success`, source: `state:launch-custodian-${missState}`, target: "ending:solo-escape", label: "Solo launch succeeds" },
          { id: `edge:launch:${missState}:recovery`, source: `state:launch-custodian-${missState}`, target: missState === "two-misses" ? "ending:no-survivors" : `decision:boat-recovery-${missState === "first" ? "one-miss" : "two-misses"}`, label: missState === "two-misses" ? "Another miss ends in storm" : "Solo fails / quiet miss" },
        ];
      }),
      { id: "edge:survival:all-dead", source: "mechanic:survival", target: "ending:no-survivors", label: "If nobody remains alive" },
    ];
    for (const recoveryId of ["boat-recovery-one-miss", "boat-recovery-two-misses"]) {
      if (!routeIds.has(recoveryId)) continue;
      stateEdges.push({ id: `edge:${recoveryId}:launch`, source: `decision:${recoveryId}`, target: recoveryId === "boat-recovery-one-miss" ? "state:launch-custodian-one-miss" : "state:launch-custodian-two-misses", label: "Repair then choose" });
    }
    nodes.push({ id: "mechanic:survival", data: { kind: "mechanic", title: "Daily survival tick", subtitle: "Every three group decisions", details: ["Food decreases by 10 per character per in-game day.", "A character starting a day at zero food loses up to 20 health.", "At zero health the character becomes a ghost.", "This applies after every third group decision in campaign play."], source: "src/shared/rules/survival.ts · src/shared/rules/stateMachine.ts", tags: ["survival", "hunger", "death"] } });
    edges.push(...stateEdges);
  } else {
    nodes.push({ id: "mechanic:survival", data: { kind: "mechanic", title: "Daily survival tick", subtitle: "Every three group decisions", details: ["Food decreases by 10 per character per in-game day.", "Starting a day at zero food causes up to 20 health damage.", "Zero health changes status to ghost."], source: "src/shared/rules/survival.ts", tags: ["survival", "hunger", "death"] } });
  }
  return { nodes, edges };
}

const allCampaignCards = [...campaignCases(), ...boatCases()];
const encounterCards = mergeCards(DECISION_CARDS).map((card) => ({ id: card.id, card, title: card.prompt, context: "Encounter catalog entry. The current rules do not assign it a fixed successor campaign scene." }));

export const MECHANICS: MechanicSpec[] = [
  { id: "mechanic:crash", data: { kind: "mechanic", title: "Crash choices", subtitle: "Starting items and rescue attempts", details: ["Each player receives three random starting-item options.", "Players privately select an item and choose whom to rescue.", "Crash rescue submissions resolve together and can save or eliminate either or both characters."], source: "src/shared/rules/itemOffers.ts · src/shared/rules/crashRescue.ts", tags: ["crash", "random", "survival"] } },
  { id: "mechanic:voting", data: { kind: "mechanic", title: "Group voting", subtitle: "Public votes · early resolve · random fallback", details: ["Eligible voters submit group votes; group choices are visible live, while selfish private choices are not.", "When all connected players vote, the room resolves after its minimum vote window instead of waiting for the full timer.", "A tied lead is resolved randomly among the tied options.", "No votes also selects randomly from eligible options."], source: "src/shared/rules/resolveVote.ts · worker/game/GameRoom.ts · worker/game/roomScheduler.ts", tags: ["votes", "random", "multiplayer", "timer"] } },
  { id: "mechanic:assignment", data: { kind: "mechanic", title: "Crew nomination", subtitle: "Assign an eligible living character", details: ["Votes for the winning option nominate a character.", "The most-nominated eligible living character is assigned.", "Nomination ties are resolved randomly.", "If no valid nomination exists, choose a random eligible survivor."], source: "src/shared/rules/assignments.ts", tags: ["nomination", "assignment", "random"] } },
  { id: "mechanic:refusal", data: { kind: "mechanic", title: "Assigned task response", subtitle: "Accept · refuse · timeout", details: ["An assigned actor can accept or attempt refusal.", "Refusal uses the assignment's configured probability and fallback outcomes.", "Timeout accepts the task if the actor remains alive.", "Unavailable actors use the configured refusal-success outcomes."], source: "src/shared/rules/stateMachine.ts · resolvePendingAssignment", tags: ["assignment", "risk", "timeout"] } },
  { id: "mechanic:outcomes", data: { kind: "mechanic", title: "Weighted outcomes", subtitle: "Resolve the selected option", details: ["Outcome weights are authored per option.", "The selected outcome applies clamped crew/character resource changes.", "Some outcomes may eliminate a random living character.", "Assigned-actor effects target the assigned character."], source: "src/shared/rules/outcomes.ts", tags: ["chance", "resources", "death"] } },
  { id: "mechanic:survival", data: { kind: "mechanic", title: "Food and starvation", subtitle: "One in-game day per three group decisions", details: ["Daily food consumption: 10.", "If food was already zero at day start, health damage is up to 20.", "At zero health, status changes to ghost.", "Survival applies after every third ordinary group decision; hunger interrupts add no daily tick."], source: "src/shared/rules/survival.ts · src/shared/rules/stateMachine.ts", tags: ["hunger", "health", "death"] } },
  { id: "mechanic:private-choices", data: { kind: "mechanic", title: "Private boat choices", subtitle: "Fuel custody and launch custodian", details: ["Fuel discovery offers share, hide, or transfer; default is share.", "The custodian can wake the group, attempt a solo launch, or quietly miss an opportunity when eligible.", "Timeout wakes the crew by default.", "Private fuel ownership is hidden from other players."], source: "src/shared/rules/motorboat.ts · src/shared/rules/stateMachine.ts", tags: ["private", "selfish", "timeout"] } },
  { id: "mechanic:boat-risk", data: { kind: "mechanic", title: "Motorboat opportunity and storm", subtitle: "Three genuine misses end in storm loss", details: ["Sturdy/fragile repair affects group and solo success chances.", "A launch attempt consumes fuel; each failed launch or valid wait records a unique opportunity miss.", "The third genuine missed opportunity triggers the storm ending.", "Successful escape records exact escaped, stranded, and dead survivors."], source: "src/shared/rules/motorboat.ts · src/shared/rules/stateMachine.ts", tags: ["motorboat", "risk", "ending"] } },
  { id: "mechanic:crew-reactions", data: { kind: "mechanic", title: "Crew dialogue and reactions", subtitle: "Profiles respond to shared story events", details: ["Character profiles define personality, strengths, flaws, and context-specific reaction lines.", "Shared success, setbacks, danger, hunger, rescues, and deaths select deterministic crew interaction beats.", "Selected animation, behavior text, pair interaction, and emotion are presentation outputs; they do not decide the story outcome."], source: "src/shared/content/characterProfiles.ts · src/scene/crewHistoryDirector.ts", tags: ["dialogue", "emotions", "animation"] } },
];

export function getStoryMapGraph(mode: MapMode): StoryMapGraph {
  if (mode === "mechanics") return { nodes: MECHANICS, edges: [
    { id: "mechanic-flow-1", source: "mechanic:voting", target: "mechanic:assignment", label: "Winning assigned choice" },
    { id: "mechanic-flow-2", source: "mechanic:assignment", target: "mechanic:refusal", label: "Actor selected" },
    { id: "mechanic-flow-3", source: "mechanic:refusal", target: "mechanic:outcomes", label: "Response resolved" },
    { id: "mechanic-flow-4", source: "mechanic:outcomes", target: "mechanic:survival", label: "Apply outcome" },
    { id: "mechanic-flow-5", source: "mechanic:private-choices", target: "mechanic:boat-risk", label: "Boat route" },
  ] };
  if (mode === "route") return buildCardGraph(allCampaignCards, "route");
  return buildCardGraph(encounterCards, "encounters");
}

export const STORY_MAP_COUNTS = {
  routeDecisions: allCampaignCards.length,
  encounterDecisions: encounterCards.length,
  mechanics: MECHANICS.length,
};
