import { useEffect, useMemo, useRef, useState } from "react";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  CHARACTER_CATALOG,
  MAX_PLAYER_COUNT,
  INITIAL_CHARACTER_RESOURCES,
  type CampaignState,
  type DecisionCard,
  type EventEntry,
  type EscapeResult,
  type MotorboatEventFacts,
  type MotorboatRouteState,
  type Player,
  type PrivateRoomState,
  type PublicDecision,
  type PublicGameSnapshot,
  type PublicLiveVote,
  type ResolvedDecision,
  type ResolvedResourceChange,
  type ResolvedStatusChange,
} from "../../shared/domain";
import { CHARACTER_PROFILES } from "../../shared/content/characterProfiles";
import { selectDecisionPromptDialogue, traceResolvedCrewDialogue } from "../../shared/content/crewDialogue";
import { CharacterModel } from "../../scene/characters/CharacterModel";
import characterAssetManifest from "../../../public/models/characters/manifest.json";
import { DECISION_CARDS } from "../../shared/content/decisionCards";
import { SHORELINE_PRIORITY_CARD, createCaveExpeditionCard, createCoastalExpeditionCard, createCoastalHazardCard, createCrewCouncilCard, createDaybreakSurveyCard, createEscapeProjectCard, createFirstNightCard, createFreshwaterRunCard, createMedicalTriageCard, createShelterReinforcementCard, createSignalApproachCard, createSignalAttemptCard, createSignalPreparationCard, createSignalWindowCard, createStormWarningCard, createWildlifeEncounterCard } from "../../shared/content/campaignRoute";
import { createMotorboatDiscoveryCard, createMotorboatGroupLaunchCard, createMotorboatRepairCard } from "../../shared/content/motorboatRoute";
import { applyOutcome, pickWeightedOutcome } from "../../shared/rules/outcomes";
import { resolveAssignedActor } from "../../shared/rules/assignments";
import { cryptoRandom } from "../../shared/rules/random";
import { DecisionConsole } from "../../ui/organisms/DecisionConsole";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import { SettingsDrawer } from "../../ui/organisms/SettingsDrawer";
import { playSound, requestDecisionMusic, unlockAudio } from "../../audio/audioSystem";
import { StoryIncidentRoom } from "./StoryIncidentRoom";
import { SessionDebrief } from "./SessionDebrief";
import { toSessionScenePresentation } from "../../scene/sessionPresentation";
import type { IncidentPresentation } from "../story/incidentPresentation";
import styles from "./DecisionTestScreen.module.css";

const firstNightCampaign: CampaignState = {
  node: "first-night", radioRecovered: true, radioRepaired: false, shelterSecured: false,
  coveLocated: false, lookoutSent: false, flareConsumed: false, signalAttempted: false, signalFailed: false, signalPosition: "unselected", coveReached: false, storyFlags: [], decisionsSinceFoodTick: 0,
};
const escapeCampaign: CampaignState = { ...firstNightCampaign, node: "escape-project", radioRepaired: true, coveLocated: true };
const signalCampaign: CampaignState = { ...escapeCampaign, node: "signal-attempt", radioRepaired: false, flareConsumed: false, signalAttempted: false };
const motorboatBase: MotorboatRouteState = {
  node: "repair", discovered: true, hull: "sound", engine: "broken", fuelCharges: 2, fuelVisibility: "shared",
  warningLevel: 0, missedOpportunityIds: [], completion: "active", repairParts: true, engineDiagnosed: true,
};
const decisionCards: DecisionCard[] = [
  SHORELINE_PRIORITY_CARD,
  createFirstNightCard(firstNightCampaign),
  createDaybreakSurveyCard(),
  createFreshwaterRunCard(firstNightCampaign),
  createWildlifeEncounterCard(firstNightCampaign),
  createMedicalTriageCard(["first-aid-kit"]),
  createCaveExpeditionCard(firstNightCampaign),
  createShelterReinforcementCard({ ...firstNightCampaign, storyFlags: ["wreck-supplies"] }, ["rope"]),
  createCrewCouncilCard(firstNightCampaign),
  createStormWarningCard(firstNightCampaign),
  createEscapeProjectCard(escapeCampaign),
  createSignalPreparationCard(escapeCampaign, ["flare"]),
  createSignalApproachCard(["rope", "binoculars"]),
  createSignalWindowCard({ ...escapeCampaign, node: "signal-window", storyFlags: ["coast-route-marked"] }),
  createSignalAttemptCard(signalCampaign, true),
  createCoastalExpeditionCard(escapeCampaign),
  createCoastalHazardCard(escapeCampaign, ["rope"]),
  ...DECISION_CARDS,
  createMotorboatDiscoveryCard(escapeCampaign),
  createMotorboatRepairCard(motorboatBase, 50, ["knife"]),
  createMotorboatRepairCard({ ...motorboatBase, warningLevel: 1, missedOpportunityIds: ["preview-tide"] }, 50, ["knife"]),
  createMotorboatGroupLaunchCard({ ...motorboatBase, node: "launch", engine: "sturdy" }),
];

const decisionLabels: Record<string, string> = {
  "campaign-shoreline-priority": "Crash beach · first choice",
  "campaign-first-night": "First night · camp plan",
  "campaign-daybreak-survey": "Daybreak · island survey",
  "campaign-freshwater-run": "Water · freshwater run",
  "campaign-wildlife-encounter": "Wildlife · boar at camp",
  "campaign-medical-triage": "Crew · medical triage",
  "campaign-cave-expedition": "Island · cave expedition",
  "campaign-shelter-reinforcement": "Camp · reinforce shelter",
  "campaign-crew-council": "Crew · camp council",
  "campaign-storm-warning": "Weather · storm warning",
  "campaign-escape-project": "Escape plan · route choice",
  "campaign-signal-preparation": "Signal · prepare the attempt",
  "campaign-signal-approach": "Signal · climb to the ridge",
  "campaign-signal-window": "Signal · choose the weather window",
  "campaign-signal-attempt": "Escape plan · signal attempt",
  "campaign-coastal-expedition": "Boat route · coastal expedition",
  "campaign-coastal-hazard": "Boat route · reef crossing",
  "motorboat-discovery": "Motorboat · discovery",
  "motorboat-repair": "Motorboat · repair",
  "motorboat-recovery": "Motorboat · recovery after a failed launch",
  "motorboat-group-launch": "Motorboat · launch",
};

const sceneArtChoices: Array<{ id: string; label: string; scene: IncidentPresentation }> = [
  { id: "shelter", label: "Shelter secured", scene: { title: "Shelter secured", location: "First camp · outcome preview", image: "/images/incidents/shelter-secured.jpg", description: "The completed shelter keeps the first storm off the crew." } },
  { id: "signal-rescue", label: "Signal rescue ending", scene: { title: "Signal seen", location: "Rocky coast · ending preview", image: "/images/incidents/signal-rescue.jpg", description: "A rescue vessel turns toward the flare above the coast." } },
  { id: "signal-failure", label: "Signal failure", scene: { title: "The signal fades", location: "Rocky coast · outcome preview", image: "/images/incidents/signal-failure.jpg", description: "The flare dies in the rain as the ship disappears beyond the headland." } },
  { id: "motorboat-storm", label: "Motorboat storm", scene: { title: "Driven back to shore", location: "Sheltered cove · outcome preview", image: "/images/incidents/motorboat-storm.jpg", description: "Rough surf forces the damaged boat back onto the rocks." } },
  { id: "motorboat-escape", label: "Motorboat escape ending", scene: { title: "Clear of the reef", location: "Open water · ending preview", image: "/images/incidents/motorboat-escape.jpg", description: "The patched boat reaches open water as the island falls behind." } },
];

const danielAnimationLibrary = [
  "dance_02", "laugh_02", "fall", "clap", "fire", "hit_to_head", "frustrated_02", "frustrated_01",
  "complain_01", "greet_03", "sing_03", "hit_to_side", "defeat_03", "front_kick_01", "defeat_02",
  "press-up", "lift_heavy", "wait", "idle", "dig", "dance_05", "hit_to_stomach", "afraid", "fold_arms",
  "depressed", "agree", "cheer", "look_around", "hug", "warm_up", "box_03",
];

function getCharacterAnimationClips(characterId: string): string[] {
  if (characterId === "cast-daniel") return danielAnimationLibrary.filter((clip) => !/walk|run/i.test(clip));
  const assetId = characterId.replace(/^cast-/u, "");
  return (characterAssetManifest.characters.find(({ id }) => id === assetId)?.retainedClips ?? ["idle"]).filter((clip) => !/walk|run/i.test(clip));
}

function formatAnimationName(clip: string): string {
  return clip.replace(/[_-]+/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function resourceChanges(before: PrivateRoomState, after: PrivateRoomState): ResolvedResourceChange[] {
  const changes: ResolvedResourceChange[] = [];
  if (before.resources.shelter !== after.resources.shelter) {
    changes.push({ scope: "crew", resource: "shelter", before: before.resources.shelter, after: after.resources.shelter, delta: after.resources.shelter - before.resources.shelter, cause: "outcome" });
  }
  for (const characterId of Object.keys(before.characters)) {
    const oldResources = before.characters[characterId]!.resources;
    const newResources = after.characters[characterId]!.resources;
    for (const resource of ["food", "health", "morale", "water"] as const) {
      const oldValue = oldResources[resource];
      const newValue = newResources[resource];
      if (oldValue !== newValue) changes.push({ scope: "character", characterId, resource, before: oldValue, after: newValue, delta: newValue - oldValue, cause: "outcome" });
    }
  }
  return changes;
}

function makeFixtureState(card: DecisionCard, players: Player[], now: number, campaign?: CampaignState): PrivateRoomState {
  const characters = Object.fromEntries(players.flatMap(({ characterId }) => characterId ? [[characterId, { characterId, status: "alive" as const, resources: { ...INITIAL_CHARACTER_RESOURCES } }]] : []));
  return {
    code: "LOCAL", revision: 1, phase: "decision", createdAt: now, lastActivityAt: now,
    hostPlayerId: players[0]!.id, phaseStartedAt: now, phaseDeadlineAt: now + 120_000,
    votingOpensAt: now, earliestResolveAt: now, phaseEndsAt: now + 120_000,
    players: Object.fromEntries(players.map((player) => [player.id, player])), characters,
    resources: { shelter: 50 }, deck: [card], decisionIndex: 0, currentDecisionId: card.id,
    votesByPlayer: {}, eligibleVoterIds: players.map(({ id }) => id), eventHistory: [], ...(campaign ? { campaign } : {}),
  };
}

function createDebriefPreview(base: PublicGameSnapshot): PublicGameSnapshot {
  const startedAt = Date.now() - 35 * 60_000;
  const members = base.players.filter(({ characterId }) => Boolean(characterId));
  const lostId = members.at(-1)?.characterId;
  const survivorId = members[0]?.characterId;
  const finalPlayers = base.players.map((player) => ({ ...player, status: player.characterId === lostId ? "ghost" as const : "alive" as const }));
  const finalCharacters = base.characters.map((character) => ({
    ...character,
    status: character.characterId === lostId ? "ghost" as const : "alive" as const,
    resources: character.characterId === lostId ? { health: 0, food: 0, water: 0, morale: 0 } : { health: 71, food: 28, water: 54, morale: 62 },
  }));
  const makeChanges = (resource: "health" | "food" | "water" | "morale", delta: number): ResolvedResourceChange[] => members.flatMap(({ characterId }) => {
    if (!characterId) return [];
    const before = resource === "health" ? 90 : resource === "food" ? 38 : resource === "water" ? 42 : 58;
    const after = Math.max(0, Math.min(100, before + delta));
    return [{ scope: "character", characterId, resource, before, after, delta: after - before, cause: "outcome" }];
  });
  const event = (id: string, minute: number, decisionId: string, prompt: string, label: string, text: string, resourceChanges: ResolvedResourceChange[], options: Array<{ optionId: string; label: string; votes: number }>, motorboat?: MotorboatEventFacts, statusChanges: ResolvedStatusChange[] = []): EventEntry => {
    const resolution: ResolvedDecision = { decisionId, prompt, winningOptionId: options[0]?.optionId ?? "preview-choice", winningOptionLabel: label, outcomeId: `${id}-result`, outcomeText: text, optionResults: options, resourceChanges, statusChanges, affectedCharacterIds: [...new Set([...resourceChanges.flatMap((change) => change.scope === "character" ? [change.characterId] : []), ...statusChanges.map(({ characterId }) => characterId)])], presentationCue: resourceChanges.some(({ delta }) => delta < 0) || statusChanges.length ? "danger" : "success", ...(motorboat ? { motorboat } : {}) };
    return { id, createdAt: startedAt + minute * 60_000, decisionId, winningOptionId: resolution.winningOptionId, outcomeId: resolution.outcomeId, text, resolution, ...(motorboat ? { motorboat } : {}), ...(statusChanges.length ? { deathCharacterIds: statusChanges.map(({ characterId }) => characterId) } : {}) };
  };
  const lastMotorboatFacts: MotorboatEventFacts = { node: "complete", boatChange: "escaped", opportunityId: "last-good-tide", passengerCharacterIds: survivorId ? [survivorId] : [], endingCause: "solo-launch", fuelConsumed: true };
  const history = [
    event("debrief-preview-radio", 7, "campaign-shoreline-priority", "The tide is rising around the wreck. What should the crew secure first?", "Pull radio parts from the fuselage", "The battery and aerial survive. The crew scrapes up their hands hauling them free.", makeChanges("health", -4), [{ optionId: "recover-radio", label: "Pull radio parts from the fuselage", votes: Math.max(1, members.length - 1) }, { optionId: "move-to-cover", label: "Get everyone under cover", votes: 1 }]),
    event("debrief-preview-water", 15, "campaign-freshwater-run", "The crew is thirsty. How should they get water?", "Follow the stream to its source", "A thorny climb leaves the crew with small scrapes, but they find a clear spring and mark the route.", [...makeChanges("health", -2), ...makeChanges("water", 15)], [{ optionId: "follow-stream", label: "Follow the stream to its source", votes: members.length }, { optionId: "collect-rain", label: "Set up a rain catch", votes: 0 }]),
    event("debrief-preview-boar", 23, "campaign-wildlife-encounter", "A wild boar has reached the food pile. What should the crew do?", "Toss food away from camp", "Each survivor sacrifices eight food units as bait. The boar leaves camp alone, and the plan lifts morale.", [...makeChanges("food", -8), ...makeChanges("morale", 4)], [{ optionId: "throw-rations", label: "Toss food away from camp", votes: members.length - 1 }, { optionId: "make-noise", label: "Clatter pans and drive it away", votes: 1 }, { optionId: "retreat", label: "Give it space", votes: 0 }]),
    event("debrief-preview-bear", 29, "bear-encounter", "A bear is close to the shelter. What should the crew do?", "Drive it off together", "The bear breaks through the perimeter. One survivor is killed while the rest escape with bruises.", makeChanges("health", -12), [{ optionId: "drive-off", label: "Drive it off together", votes: members.length }, { optionId: "leave-food", label: "Leave food and retreat", votes: 0 }], undefined, lostId ? [{ characterId: lostId, before: "alive", after: "ghost", cause: "outcome" }] : []),
    event("debrief-preview-solo", 35, "motorboat-last-good-tide", "The last good tide is here. Launch alone or wake the group?", "Leave alone now", "The custodian takes the last good tide alone, escaping in the fragile boat and leaving the crew behind.", [], [{ optionId: "solo", label: "Leave alone now", votes: 2 }, { optionId: "wake", label: "Wake the group", votes: Math.max(0, members.length - 2) }], lastMotorboatFacts),
  ];
  const escaped: string[] = survivorId ? [survivorId] : [];
  const stranded = members.flatMap(({ characterId }) => characterId && characterId !== lostId && characterId !== survivorId ? [characterId] : []);
  const dead: string[] = lostId ? [lostId] : [];
  const escapeResult: EscapeResult = { type: "solo-escape", escapedCharacterIds: escaped, strandedCharacterIds: stranded, deadCharacterIds: dead, cause: "solo-launch", epilogueId: "motorboat-selfish-aftermath-v1" };
  return { ...base, code: "LOG42", createdAt: startedAt, startedAt, phase: "ending", eventHistory: history, players: finalPlayers, characters: finalCharacters, endingId: "solo-escape", escapeResult };
}

function cueFor(outcome: DecisionCard["options"][number]["outcomes"][number]): ResolvedDecision["presentationCue"] {
  if (outcome.eliminateRandomLiving || outcome.eliminateCharacterId || (outcome.resourceDeltas?.health ?? 0) < 0) return "danger";
  const deltas = Object.values(outcome.resourceDeltas ?? {});
  const gain = deltas.reduce((sum, value) => sum + Math.max(0, value), 0);
  const loss = deltas.reduce((sum, value) => sum + Math.max(0, -value), 0);
  return gain > loss ? "success" : loss > gain ? "setback" : "neutral";
}

export default function DecisionTestScreen() {
  const [cardId, setCardId] = useState(decisionCards[0]!.id);
  const [crewSize, setCrewSize] = useState(4);
  const [castGroup, setCastGroup] = useState<"core" | "additional" | "full">("core");
  const [showModelGallery, setShowModelGallery] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const audioSettingsDialogRef = useRef<HTMLElement>(null);
  const [previewCharacterId, setPreviewCharacterId] = useState(CHARACTER_CATALOG[0]!.id);
  const [previewAnimation, setPreviewAnimation] = useState("idle");
  const [selectedOptionId, setSelectedOptionId] = useState<string>();
  const [assignedCharacterId, setAssignedCharacterId] = useState<string>();
  const [agreementNominees, setAgreementNominees] = useState<Record<string, string>>({});
  const [selectedOutcomeId, setSelectedOutcomeId] = useState("weighted");
  const [selectedSceneArtId, setSelectedSceneArtId] = useState("");
  const [animatedPortraits, setAnimatedPortraits] = useState(true);
  const [previewDeadCrewMember, setPreviewDeadCrewMember] = useState(false);
  const [dialogueSeed, setDialogueSeed] = useState(1);
  const [liveVotes, setLiveVotes] = useState<PublicLiveVote[]>([]);
  const [event, setEvent] = useState<EventEntry>();
  const [previewClockStart, setPreviewClockStart] = useState(() => Date.now());
  useEffect(() => {
    if (!settingsOpen) {
      requestAnimationFrame(() => document.getElementById("decision-test-settings-toggle")?.focus());
      return;
    }
    audioSettingsDialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSettingsOpen(false); return; }
      if (event.key !== "Tab" || !audioSettingsDialogRef.current) return;
      const focusable = [...audioSettingsDialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === audioSettingsDialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);
  const previewDeadline = previewClockStart + 120_000;
  const card = decisionCards.find(({ id }) => id === cardId) ?? decisionCards[0]!;

  const audioContext = `${card.id} ${card.prompt}`.toLowerCase();
  const previewMusicTheme = /motorboat|launch|escape|engine|fuel|boat/.test(audioContext)
    ? "escape" : /signal|radio|flare|plane|rescue|help/.test(audioContext) ? "signal" : "survival";
  useEffect(() => {
    requestDecisionMusic(true, 0, previewMusicTheme);
    return () => requestDecisionMusic(false);
  }, [previewMusicTheme]);

  const previewCast = useMemo(() => {
    if (castGroup === "full") return CHARACTER_CATALOG;
    return castGroup === "core" ? CHARACTER_CATALOG.slice(0, 8) : CHARACTER_CATALOG.slice(8);
  }, [castGroup]);
  const players = useMemo<Player[]>(() => previewCast.slice(0, crewSize).map((character, index) => ({
    id: `local-test-${index + 1}`, displayName: `Test Player ${index + 1}`, characterId: character.id,
    status: "alive", ready: true, connected: true, joinedAt: index,
  })), [crewSize, previewCast]);
  const characterNames = useMemo(() => Object.fromEntries(CHARACTER_CATALOG.map(({ id, displayName }) => [id, displayName])), []);
  const publicDecision = useMemo<PublicDecision>(() => ({
    id: card.id, prompt: card.prompt,
    options: card.options.map(({ id, label, assignment }) => ({ id, label, ...(assignment ? { assignment: { roleLabel: assignment.roleLabel, eligibleCharacterIds: players.flatMap(({ characterId }) => characterId ? [characterId] : []) } } : {}) })),
  }), [card, players]);

  const selectedOption = card.options.find(({ id }) => id === selectedOptionId);
  const outcomeOptions = selectedOption?.outcomes ?? [];
  const livePlayers = players;
  const eligibleNomineeIds = players.flatMap(({ characterId, status }) => characterId && status === "alive" ? [characterId] : []);
  const optionCounts = Object.fromEntries(card.options.map(({ id }) => [id, liveVotes.filter((vote) => vote.optionId === id).length]));
  const canSimulateAgreement = Boolean(selectedOption && players.length > 1 && (!selectedOption.assignment || players.every(({ id }) => eligibleNomineeIds.includes(agreementNominees[id] ?? assignedCharacterId ?? ""))));

  const clearPreview = () => {
    setPreviewClockStart(Date.now());
    setSelectedOptionId(undefined);
    setAssignedCharacterId(undefined);
    setAgreementNominees({});
    setSelectedOutcomeId("weighted");
    setLiveVotes([]);
    setEvent(undefined);
  };

  const changeCard = (nextId: string) => {
    unlockAudio();
    playSound("decision-open");
    setPreviewClockStart(Date.now());
    setCardId(nextId);
    setSelectedOptionId(undefined);
    setAssignedCharacterId(undefined);
    setAgreementNominees({});
    setSelectedOutcomeId("weighted");
    setSelectedSceneArtId("");
    setLiveVotes([]);
    setEvent(undefined);
  };

  const recordLocalVote = (optionId: string, assignedId?: string) => {
    unlockAudio();
    playSound("vote-submit");
    setSelectedOptionId(optionId);
    setAssignedCharacterId(assignedId);
    setAgreementNominees(Object.fromEntries(players.map(({ id }) => [id, assignedId ?? ""])));
    setSelectedOutcomeId("weighted");
    setLiveVotes((current) => [...current.filter(({ playerId }) => playerId !== players[0]!.id), { playerId: players[0]!.id, optionId, ...(assignedId ? { assignedCharacterId: assignedId } : {}) }]);
  };

  const simulateCrewAgreement = () => {
    if (!selectedOptionId) return;
    unlockAudio();
    playSound("library-ui-confirm");
    setLiveVotes(players.map((player) => {
      const nominee = selectedOption?.assignment ? agreementNominees[player.id] ?? assignedCharacterId : undefined;
      return { playerId: player.id, optionId: selectedOptionId, ...(nominee ? { assignedCharacterId: nominee } : {}) };
    }));
  };

  const resolvePreview = () => {
    if (!selectedOption) return;
    unlockAudio();
    const now = Date.now();
    const chosenOutcome = selectedOutcomeId === "weighted"
      ? pickWeightedOutcome(selectedOption.outcomes, cryptoRandom)
      : selectedOption.outcomes.find(({ id }) => id === selectedOutcomeId) ?? selectedOption.outcomes[0]!;
    const before = makeFixtureState(card, players, now);
    before.votesByPlayer = Object.fromEntries(liveVotes.map(({ playerId, optionId }) => [playerId, optionId]));
    before.assignmentNominationsByPlayer = Object.fromEntries(liveVotes.flatMap(({ playerId, assignedCharacterId: nominated }) => nominated ? [[playerId, nominated]] : []));
    const assignedActor = selectedOption.assignment ? resolveAssignedActor(before, selectedOption.id, cryptoRandom) : null;
    const after = applyOutcome(before, chosenOutcome, cryptoRandom, assignedActor?.actorCharacterId);
    const statusChanges: ResolvedStatusChange[] = Object.keys(before.characters).flatMap((characterId) => {
      const beforeStatus = before.characters[characterId]!.status;
      const afterStatus = after.characters[characterId]!.status;
      return beforeStatus === afterStatus ? [] : [{ characterId, before: beforeStatus, after: afterStatus, cause: "outcome" as const }];
    });
    const resolution: ResolvedDecision = {
      decisionId: card.id, prompt: card.prompt, winningOptionId: selectedOption.id, winningOptionLabel: selectedOption.label,
      outcomeId: chosenOutcome.id, outcomeText: chosenOutcome.text,
      optionResults: card.options.map(({ id, label }) => ({ optionId: id, label, votes: optionCounts[id] ?? 0 })),
      resourceChanges: resourceChanges(before, after), statusChanges,
      affectedCharacterIds: [...new Set([...resourceChanges(before, after).flatMap((change) => change.scope === "character" ? [change.characterId] : []), ...statusChanges.map(({ characterId }) => characterId)])],
      presentationCue: cueFor(chosenOutcome),
      ...(selectedOption.assignment && assignedActor ? { assignment: { id: `preview-${card.id}-${selectedOption.id}`, actorCharacterId: assignedActor.actorCharacterId, roleLabel: selectedOption.assignment.roleLabel, selectionMethod: assignedActor.selectionMethod, result: "accepted" as const } } : {}),
    };
    playSound("consequence-reveal");
    if (statusChanges.some(({ after: status }) => status === "ghost")) playSound("ghost-arrival");
    if (resolution.presentationCue === "success") playSound("outcome-success");
    if (resolution.presentationCue === "danger" || resolution.presentationCue === "setback") playSound("outcome-setback");
    const previewEvent = {
      id: `local-preview-${card.id}`, createdAt: now, decisionId: card.id, winningOptionId: selectedOption.id,
      outcomeId: chosenOutcome.id, socialCue: resolution.presentationCue,
      deathCharacterIds: statusChanges.filter(({ after: status }) => status === "ghost").map(({ characterId }) => characterId),
      text: `The crew chose “${selectedOption.label}.” ${chosenOutcome.text}`, resolution,
    };
    setEvent(previewEvent);
  };

  // This seed changes only the locally selected dialogue. It does not reroll
  // the selected outcome or mutate resource/decision preview state.
  const renderedEvent = useMemo(() => {
    if (!event) return undefined;
    const dead = new Set(event.deathCharacterIds ?? []);
    const participants = players.map(({ characterId }) => characterId).filter((id): id is string => id !== null && !dead.has(id));
    const crewDialogue = traceResolvedCrewDialogue(`LOCAL-DIALOGUE-${dialogueSeed}`, event, participants).exchange;
    return { ...event, ...(crewDialogue ? { crewDialogue } : {}) };
  }, [dialogueSeed, event, players]);
  const dialogueTrace = event ? traceResolvedCrewDialogue(`LOCAL-DIALOGUE-${dialogueSeed}`, event, players.map(({ characterId }) => characterId).filter((id): id is string => id !== null && !new Set(event.deathCharacterIds ?? []).has(id))) : undefined;

  const snapshot = useMemo<PublicGameSnapshot>(() => {
    const now = Date.now();
    const phase = renderedEvent ? "reveal" : "decision";
    const campaignNodeByCardId: Record<string, CampaignState["node"]> = {
      "campaign-first-night": "first-night", "campaign-daybreak-survey": "daybreak-survey", "campaign-freshwater-run": "freshwater-run",
      "campaign-wildlife-encounter": "wildlife-encounter", "campaign-medical-triage": "medical-triage", "campaign-cave-expedition": "cave-expedition",
      "campaign-shelter-reinforcement": "shelter-reinforcement", "campaign-crew-council": "crew-council", "campaign-storm-warning": "storm-warning",
      "campaign-escape-project": "escape-project", "campaign-signal-preparation": "signal-preparation", "campaign-signal-attempt": "signal-attempt",
      "campaign-signal-approach": "signal-approach", "campaign-signal-window": "signal-window",
      "campaign-coastal-expedition": "coastal-expedition", "campaign-coastal-hazard": "coastal-hazard",
    };
    const node = campaignNodeByCardId[card.id];
    const campaignBase = node === "escape-project" ? escapeCampaign : node === "signal-attempt" ? signalCampaign : firstNightCampaign;
    const campaign = node ? { ...campaignBase, node } : undefined;
    return {
      code: "LOCAL", revision: renderedEvent ? 2 : 1, phase, hostPlayerId: players[0]!.id,
      phaseStartedAt: now, phaseDeadlineAt: phase === "decision" ? now + 120_000 : null,
      votingOpensAt: phase === "decision" ? now : null, earliestResolveAt: phase === "decision" ? now : null,
      phaseEndsAt: phase === "decision" ? now + 120_000 : null,
      players: livePlayers.map((player, index) => ({ ...player, status: renderedEvent?.deathCharacterIds?.includes(player.characterId ?? "") || (previewDeadCrewMember && index === livePlayers.length - 1) ? "ghost" : "alive" })),
      characters: livePlayers.flatMap(({ characterId }, index) => characterId ? [{ characterId, status: renderedEvent?.deathCharacterIds?.includes(characterId) || (previewDeadCrewMember && index === livePlayers.length - 1) ? "ghost" as const : "alive" as const, resources: { ...INITIAL_CHARACTER_RESOURCES } }] : []),
      characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
      currentDecision: phase === "decision" ? publicDecision : null,
      decisionNumber: Math.max(1, decisionCards.findIndex(({ id }) => id === card.id) + 1), totalDecisions: decisionCards.length,
      eligibleVoterIds: players.map(({ id }) => id), eventHistory: renderedEvent ? [renderedEvent] : [],
      ...(phase === "decision" ? { activeCrewDialogue: selectDecisionPromptDialogue(`LOCAL-DIALOGUE-${dialogueSeed}`, card.id, livePlayers.flatMap(({ characterId }) => characterId ? [characterId] : [])) } : {}),
      viewer: { playerId: players[0]!.id, hasVoted: Boolean(selectedOptionId) },
      ...(phase === "decision" ? { liveVotes } : {}), ...(campaign ? { campaign } : {}),
    };
  }, [card, dialogueSeed, renderedEvent, livePlayers, liveVotes, players, previewDeadCrewMember, publicDecision, selectedOptionId]);
  const debriefPreview = useMemo(() => createDebriefPreview(snapshot), [snapshot]);
  const scenePresentation = toSessionScenePresentation(snapshot);
  const previewDialogue = (renderedEvent?.crewDialogue?.lines.flatMap(({ characterId }) => {
    const member = scenePresentation.members.find((candidate) => candidate.characterId === characterId);
    return member?.status === "alive" ? [{ characterId, name: member.name.replace(" · GHOST", ""), tint: member.tint, status: member.status, line: member.thoughtLine ?? member.reactionLine, animationName: member.animationName, animationOnce: member.animationOnce, animationHoldAtEnd: member.animationHoldAtEnd, animationEventId: member.animationEventId }] : [];
  }) ?? scenePresentation.members.filter(({ status }) => status === "alive").slice(0, 2).map(({ characterId, name, tint, status, thoughtLine, reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId }) => ({ characterId, name: name.replace(" · GHOST", ""), tint, status, line: thoughtLine ?? reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId })));
  const sceneArtOverride = sceneArtChoices.find(({ id }) => id === selectedSceneArtId)?.scene;

  const phaseContent = renderedEvent ? <div className={styles.reportState}>
    <ConsequencePanel event={renderedEvent} characterNames={characterNames} crewDialogue={previewDialogue} />
    {dialogueTrace && <details className={styles.dialogueDiagnostics}><summary>Dialogue context · seed {dialogueSeed}</summary><p>Outcome: {dialogueTrace.publicFacts.outcomeId ?? "none"} · cue: {dialogueTrace.publicFacts.socialCue} · fresh injury: {String(dialogueTrace.publicFacts.freshInjury)} · fresh death: {String(dialogueTrace.publicFacts.freshDeath)}</p><p>Selected exchange: {dialogueTrace.selectedTemplateId ?? "none"}</p>{dialogueTrace.rejectedReasons.map((reason) => <p key={reason}>Not selected: {reason}</p>)}{renderedEvent.crewDialogue?.lines.map((line, index) => <p key={`${line.characterId}-${index}`}>{characterNames[line.characterId] ?? line.characterId}: “{line.text}”</p>)}</details>}
    <div className={styles.reportActions}><p>Preview only · no lobby state was changed.</p><RetroButton type="button" tone="primary" data-tone="reset" onClick={clearPreview}>Test another choice</RetroButton></div>
  </div> : <div className={styles.decisionState}>
    <DecisionConsole
      layout="story" decision={publicDecision} deadline={previewDeadline} votingOpensAt={previewClockStart}
      selectedId={selectedOptionId} submitted={Boolean(selectedOptionId)} characterNames={characterNames} characterCatalog={CHARACTER_CATALOG}
      liveVotes={liveVotes} eligibleVoterIds={players.map(({ id }) => id)} players={players} onVote={recordLocalVote}
    />
    <div className={styles.benchActions}>
      <label><span>Outcome to preview</span><select aria-label="Outcome to preview" value={selectedOutcomeId} disabled={!selectedOption} onChange={(e) => setSelectedOutcomeId(e.target.value)}>
        <option value="weighted">Roll using the real outcome weights</option>
        {outcomeOptions.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.weight}% · {outcome.text}</option>)}
      </select></label>
      {selectedOption?.assignment && <fieldset className={styles.nominationSimulator}>
        <legend>Crew nominations · {selectedOption.assignment.roleLabel}</legend>
        <p>All test players agree on this repair approach. Set each player’s nominee; the most-nominated eligible survivor is assigned to the task.</p>
        <div className={styles.nominationRows}>{players.map((player) => <label key={player.id}>
          <span>{player.displayName} nominates</span>
          <select aria-label={`${player.displayName} nomination`} value={agreementNominees[player.id] ?? assignedCharacterId ?? ""} onChange={(event) => setAgreementNominees((current) => ({ ...current, [player.id]: event.target.value }))}>
            <option value="" disabled>Choose a living character</option>
            {eligibleNomineeIds.map((characterId) => <option key={characterId} value={characterId}>{characterNames[characterId] ?? characterId}</option>)}
          </select>
        </label>)}</div>
      </fieldset>}
      <div className={styles.actionButtons}>
        <RetroButton type="button" onClick={simulateCrewAgreement} disabled={!canSimulateAgreement}>Simulate crew agreement</RetroButton>
        <RetroButton type="button" tone="primary" data-tone="resolve" onClick={resolvePreview} disabled={!selectedOption}>Resolve preview</RetroButton>
      </div>
      <p>Local preview only. Voting, outcome rolls, and resource changes are not sent to a game room.</p>
      {snapshot.activeCrewDialogue && <details className={styles.dialogueDiagnostics}><summary>Decision-opening dialogue · seed {dialogueSeed}</summary>{snapshot.activeCrewDialogue.lines.map((line, index) => <p key={`${line.characterId}-${index}`}>{characterNames[line.characterId] ?? line.characterId}: “{line.text}”</p>)}</details>}
    </div>
  </div>;

  return <main className={styles.page}>
    <header className={styles.toolbar}>
      <BackButton href="/" className={styles.backLink} aria-label="Back to title menu" title="Back to title menu" />
      <div className={styles.heading}><p>DEVELOPMENT TOOL · LOCAL ONLY</p><h1>Decision test bench</h1></div>
      <div className={styles.toolbarActions}>
        <RetroButton id="decision-test-settings-toggle" type="button" aria-expanded={settingsOpen} aria-controls="decision-test-audio-settings" onClick={() => setSettingsOpen((open) => !open)}>{settingsOpen ? "Close audio settings" : "Audio settings"}</RetroButton>
        <label className={styles.portraitToggle}><input type="checkbox" checked={animatedPortraits} onChange={(event) => setAnimatedPortraits(event.target.checked)} /><span>3D portraits</span></label>
        <label className={styles.portraitToggle} title="Marks the last test survivor as dead to preview the red skull"><input type="checkbox" checked={previewDeadCrewMember} onChange={(event) => { unlockAudio(); setPreviewDeadCrewMember(event.target.checked); if (event.target.checked) playSound("ghost-arrival"); }} /><span>Ghost preview</span></label>
        <RetroButton type="button" onClick={() => setShowModelGallery(true)}>Model gallery</RetroButton>
        <RetroButton type="button" onClick={() => setDebriefOpen(true)}>Preview session log</RetroButton>
        <RetroButton type="button" onClick={() => setDialogueSeed((seed) => seed + 1)}>Reroll dialogue · {dialogueSeed}</RetroButton>
        <RetroButton type="button" onClick={clearPreview}>Reset</RetroButton>
      </div>
      {settingsOpen && <div className={styles.settingsModalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section ref={audioSettingsDialogRef} tabIndex={-1} className={styles.settingsModalDialog} id="decision-test-audio-settings" role="dialog" aria-modal="true" aria-label="Decision test audio settings">
          <SettingsDrawer />
          <RetroButton type="button" onClick={() => setSettingsOpen(false)}>Close audio settings</RetroButton>
        </section>
      </div>}
      <div className={styles.previewControls} aria-label="Decision preview controls">
        <label className={styles.scenario}><span>Story decision</span><select aria-label="Story decision" value={card.id} onChange={(e) => changeCard(e.target.value)}>
          {decisionCards.map((decision) => <option key={decision.id} value={decision.id}>{decisionLabels[decision.id] ?? decision.prompt}</option>)}
        </select></label>
        <label className={styles.sceneArt}><span>Scene image</span><select aria-label="Scene image preview" value={selectedSceneArtId} onChange={(e) => setSelectedSceneArtId(e.target.value)}>
          <option value="">Use story scene</option>
          {sceneArtChoices.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <label className={styles.crewSize}><span>Test crew</span><select aria-label="Test crew size" value={crewSize} onChange={(e) => { const nextSize = Number(e.target.value); if (nextSize > previewCast.length) setCastGroup("full"); setCrewSize(nextSize); clearPreview(); }}>
          {[2, 3, 4, 6, 8, 10, 12, MAX_PLAYER_COUNT].filter((size, index, sizes) => size <= MAX_PLAYER_COUNT && sizes.indexOf(size) === index).map((size) => <option key={size} value={size}>{size} survivors</option>)}
        </select></label>
        <label className={styles.castGroup}><span>Character renders</span><select aria-label="Character render group" value={castGroup} onChange={(e) => { const nextGroup = e.target.value as "core" | "additional" | "full"; const nextLimit = nextGroup === "core" ? 8 : nextGroup === "additional" ? MAX_PLAYER_COUNT - 8 : MAX_PLAYER_COUNT; const nextCount = Math.max(2, Math.min(crewSize, nextLimit)); setCastGroup(nextGroup); setCrewSize(nextCount); clearPreview(); }}>
          <option value="core">Core cast (8)</option><option value="additional">Additional cast ({MAX_PLAYER_COUNT - 8})</option><option value="full">Full roster ({MAX_PLAYER_COUNT})</option>
        </select></label>
      </div>
    </header>
    <section className={styles.room} aria-label="Decision preview">
      {!debriefOpen && <StoryIncidentRoom snapshot={snapshot} phaseContent={phaseContent} incidentOverride={sceneArtOverride} animatedPortraits={animatedPortraits && !showModelGallery} />}
    </section>
    {showModelGallery && <div className={styles.galleryBackdrop}>
      <section className={styles.gallery} role="dialog" aria-modal="true" aria-labelledby="model-gallery-title">
        <header className={styles.galleryHeader}><div><p>ANIMATED MODEL CHECK</p><h2 id="model-gallery-title">Character renders &amp; profiles</h2></div><RetroButton type="button" onClick={() => setShowModelGallery(false)}>Close</RetroButton></header>
        <div className={styles.galleryBody}>
          <nav className={styles.galleryCast} aria-label="Character models">
            {CHARACTER_CATALOG.map((character) => <button key={character.id} type="button" data-selected={previewCharacterId === character.id} onClick={() => { setPreviewCharacterId(character.id); setPreviewAnimation("idle"); }}>{character.displayName}</button>)}
          </nav>
          {(() => {
            const character = CHARACTER_CATALOG.find(({ id }) => id === previewCharacterId) ?? CHARACTER_CATALOG[0]!;
            const profile = CHARACTER_PROFILES.find(({ characterId }) => characterId === character.id);
            const animationClips = getCharacterAnimationClips(character.id);
            return <article className={styles.galleryPreview}>
              <div className={styles.modelCanvas} aria-label={`${character.displayName} 3D render`}>
                <Canvas dpr={1} camera={{ position: [0, 1.45, 3.5], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
                  <color attach="background" args={["#111317"]} /><ambientLight intensity={1.65} /><directionalLight position={[2.5, 4, 3]} intensity={2.2} />
                  <Suspense fallback={null}><CharacterModel tint={character.tint} characterId={character.id} modelUrl={character.modelUrl} animationName={previewAnimation} animationOnce={previewAnimation !== "idle"} animationHoldAtEnd={previewAnimation === "fall"} animationEventId={`gallery:${character.id}:${previewAnimation}`} showGroundMarker={false} /></Suspense>
                </Canvas>
              </div>
              <div className={styles.galleryInfo}><p className={styles.galleryEyebrow}>CREW PROFILE</p><h3>{character.displayName}</h3><p>{profile?.personality ?? "A survivor joining the island crew."}</p><div className={styles.galleryTraits}><span>Strength: {profile?.strengths.join(" · ")}</span><span>Flaw: {profile?.flaws.join(" · ")}</span></div><div className={styles.galleryAnimations} aria-label="Preview animation">
                {animationClips.map((clip) => <button key={clip} type="button" data-selected={previewAnimation === clip} onClick={() => setPreviewAnimation(clip)}>{formatAnimationName(clip)}</button>)}
              </div></div>
            </article>;
          })()}
        </div>
      </section>
    </div>}
    {debriefOpen && <SessionDebrief snapshot={debriefPreview} startedAt={debriefPreview.startedAt ?? debriefPreview.createdAt ?? Date.now()} endingId={debriefPreview.endingId} onClose={() => setDebriefOpen(false)} />}
  </main>;
}
