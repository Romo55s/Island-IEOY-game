import type { PublicGameSnapshot } from "../shared/domain";
import { CHARACTER_PROFILES } from "../shared/content/characterProfiles";
import { getCrashReactionClip } from "./phases/crashReactions";
import { ISLAND_ZONES_BY_ID } from "./world/islandLevel";
import type { EncounterZoneId } from "./world/islandLevel";
import { deriveCrewHistoryBeat } from "./crewHistoryDirector";
import {
  deriveMotorboatScenePresentation,
  getMotorboatAnimation,
  getMotorboatStageRole,
  type MotorboatScenePresentation,
  type MotorboatStageRole,
} from "./motorboatPresentation";

const DECISION_ZONES: Record<string, EncounterZoneId> = {
  "wreckage-lighter": "crash_beach", "coconut-jury": "jungle_clearing", "smoke-signal": "rocky_coast",
  "mystery-berries": "jungle_clearing", "shelter-politics": "forest_crossroads", "boar-diplomacy": "forest_crossroads",
  "rainwater-budget": "waterfall_pool", "distress-flare": "rocky_coast", "cave-of-bad-ideas": "mountain_foothills", "raft-committee": "rocky_coast",
};

export interface SessionSceneMember {
  playerId: string;
  playerName: string;
  characterId: string;
  name: string;
  tint: string;
  status: "alive" | "ghost";
  startingItemId?: string;
  animationName: string;
  animationOnce: boolean;
  animationHoldAtEnd?: boolean;
  animationEventId?: string;
  animationStartedAt?: number;
  reactionLine: string;
  thoughtLine?: string;
  behaviorLabel?: string;
  stageRole?: MotorboatStageRole;
}

const thoughtByBehavior: Record<string, string> = {
  "Lost in the crash": "I wish we could have gotten you out.",
  "Mourning a crewmate": "We stay together from here on.",
  "Suggesting a terrible plan": "We could eat each other. Unless someone has a better idea?",
  "Objecting and seeking alternatives": "No. We look for food first.",
  "Looking for another solution": "There has to be something else on this island.",
  "Searching the area for food": "I’m checking the area for something edible.",
  "Joining the food search": "I’ll search the other side of camp.",
  "Checking on an injured crewmate": "You okay? Sit down. I’ll stay with you.",
  "Recovering after the danger": "Give me a second. That was close.",
  "Keeping watch": "I’ll keep watch while everyone catches their breath.",
  "Catching a breath": "Taking a moment before the next decision.",
  "Reuniting with the crew": "I’m glad you made it back.",
  "Celebrating the group win": "That worked. We did it together.",
  "Trying to steady the crew": "We can recover. Let’s focus on the next step.",
  "Reacting to the setback": "That didn’t go as planned. What can we salvage?",
  "Watching for danger": "Stay alert. Something could still be out there.",
};

export interface SessionScenePresentation {
  phaseLabel: string;
  zoneId: EncounterZoneId;
  zoneName: string;
  members: SessionSceneMember[];
  livingCount: number;
  ghostCount: number;
  interactionPairCharacterIds: [string, string] | null;
  motorboat: MotorboatScenePresentation | null;
}

const ambientClips = [{ name: "idle", once: false }, { name: "agree", once: true }, { name: "laugh_02", once: true }] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function getAmbientClip(characterId: string, decisionNumber: number): (typeof ambientClips)[number] {
  return ambientClips[stableHash(`${characterId}:${decisionNumber}`) % ambientClips.length]!;
}

function getPhaseLabel(snapshot: PublicGameSnapshot): string {
  switch (snapshot.phase) {
    case "lobby": return "Waiting for the crew";
    case "intro": return "The flight is going badly";
    case "crashItemChoice": return "Choose what you carried out";
    case "crashRescueChoice": return "Choose who you try to save";
    case "crashResolution": return "Crash report";
    case "decision": return snapshot.currentDecision ? "Crew decision pending" : "Group decision";
    case "assignmentResponse": {
      const assignment = snapshot.activeAssignment;
      const actorName = assignment ? snapshot.characterCatalog.find(({ id }) => id === assignment.actorCharacterId)?.displayName : undefined;
      return assignment ? `${actorName ?? "A survivor"} must ${assignment.roleLabel}` : "Waiting on the assigned survivor";
    }
    case "privateChoice": {
      const choice = snapshot.activePrivateChoice;
      if (choice?.kind === "launch-custodian" && choice.publicActorCharacterId) {
        const actorName = snapshot.characterCatalog.find(({ id }) => id === choice.publicActorCharacterId)?.displayName;
        return `${actorName ?? "A survivor"} has night watch`;
      }
      return choice?.kind === "fuel-discovery" ? "Someone found fuel. They are deciding what to do" : "A survivor is making a private choice";
    }
    case "reveal": return "The island has responded";
    case "ending": return "Session ending";
    case "expired": return "Session expired";
  }
}

/** Pure presentation adapter: the scene reads server snapshots but never changes gameplay state. */
export function toSessionScenePresentation(snapshot: PublicGameSnapshot): SessionScenePresentation {
  const decisionId = snapshot.currentDecision?.id ?? snapshot.eventHistory.at(-1)?.decisionId;
  const motorboat = deriveMotorboatScenePresentation(snapshot);
  const zoneId = motorboat?.zoneId ?? (decisionId ? DECISION_ZONES[decisionId] ?? "crash_beach" : "crash_beach");
  const crewBeat = deriveCrewHistoryBeat(snapshot);
  const playersByCharacter = new Map(snapshot.players.flatMap((player) => player.characterId ? [[player.characterId, player] as const] : []));
  const members = snapshot.characters.flatMap((character) => {
    const definition = snapshot.characterCatalog.find(({ id }) => id === character.characterId);
    const player = playersByCharacter.get(character.characterId);
    if (!definition || !player) return [];

    const crashReaction = snapshot.phase === "crashResolution" && snapshot.crashResolution
      ? getCrashReactionClip(character.characterId, snapshot.crashResolution)
      : undefined;
    const latestEvent = snapshot.eventHistory.at(-1);
    const deathCharacterIds = new Set([
      ...(latestEvent?.resolution?.statusChanges.filter(({ after }) => after === "ghost").map(({ characterId }) => characterId) ?? []),
      ...(latestEvent?.motorboat?.statusChanges?.filter(({ after }) => after === "ghost").map(({ characterId }) => characterId) ?? []),
      ...(latestEvent?.deathCharacterIds ?? []),
    ]);
    // A dead character is a body in the scene, not an idle ghost. The fall clip
    // is held at its final ground pose after its first run.
    const eventClip = character.status === "ghost" ? "fall" : undefined;
    const ambientClip = getAmbientClip(character.characterId, snapshot.decisionNumber);
    const socialClip = crewBeat.animationByCharacterId[character.characterId];
    const motorboatClip = character.status === "alive" ? getMotorboatAnimation(motorboat, character.characterId) : null;
    const animationName = eventClip ?? crashReaction ?? (character.status === "ghost" ? "idle" : motorboatClip?.name ?? socialClip ?? ambientClip.name);
    const profile = CHARACTER_PROFILES.find(({ characterId }) => characterId === character.characterId);
    const reactionKind = character.status === "alive" && crewBeat.kind === "hunger-talk" ? "hunger"
      : crashReaction === "fall" || crashReaction === "afraid" || eventClip === "fall" || crewBeat.kind === "danger" || crewBeat.kind === "mourning" || crewBeat.kind === "setback" ? "danger"
      : crashReaction === "cheer" || crashReaction === "hug" || crewBeat.kind === "shared-success" || crewBeat.kind === "rescue-reunion" ? "success"
        : "calm";
    const reactionPool = profile?.reactions[reactionKind] ?? ["The island is waiting for someone to make a decision."];
    const historySeed = snapshot.eventHistory.at(-1)?.outcomeId ?? snapshot.eventHistory.at(-1)?.id ?? snapshot.decisionNumber;
    const reactionLine = reactionPool[stableHash(`${character.characterId}:${reactionKind}:${historySeed}:${snapshot.decisionNumber}`) % reactionPool.length]!;

    return [{
      playerId: player.id,
      playerName: player.displayName,
      characterId: character.characterId,
      name: `${definition.displayName}${character.status === "ghost" ? " · GHOST" : ""}`,
      tint: definition.tint,
      status: character.status,
      ...(character.startingItemId ? { startingItemId: character.startingItemId } : {}),
      animationName,
      animationOnce: animationName !== "idle" && Boolean(crashReaction || motorboatClip?.once || socialClip || eventClip || ambientClip.once),
      ...(character.status === "ghost" && animationName === "fall" ? { animationHoldAtEnd: true } : {}),
      animationEventId: `${snapshot.phase}:${snapshot.phaseStartedAt}:${snapshot.decisionNumber}:${motorboat?.eventId ?? snapshot.eventHistory.at(-1)?.id ?? "opening"}:${character.characterId}`,
      animationStartedAt: snapshot.phaseStartedAt ?? undefined,
      reactionLine,
      ...(crewBeat.behaviorByCharacterId[character.characterId]
        ? { thoughtLine: thoughtByBehavior[crewBeat.behaviorByCharacterId[character.characterId]!] ?? reactionLine }
        : {}),
      ...(snapshot.phase === "reveal" && crewBeat.behaviorByCharacterId[character.characterId]
        ? { behaviorLabel: crewBeat.behaviorByCharacterId[character.characterId] }
        : {}),
      ...(getMotorboatStageRole(motorboat, character.characterId)
        ? { stageRole: getMotorboatStageRole(motorboat, character.characterId) }
        : {}),
    }];
  });
  const livingCount = members.filter(({ status }) => status === "alive").length;

  return {
    phaseLabel: getPhaseLabel(snapshot),
    zoneId,
    zoneName: ISLAND_ZONES_BY_ID[zoneId].name,
    members,
    livingCount,
    ghostCount: members.length - livingCount,
    interactionPairCharacterIds: motorboat ? null : crewBeat.interactionPairCharacterIds,
    motorboat,
  };
}
