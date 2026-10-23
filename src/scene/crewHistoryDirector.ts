import type { PublicGameSnapshot } from "../shared/domain";
import { CHARACTER_PROFILES } from "../shared/content/characterProfiles";

export interface CrewHistoryBeat {
  kind: "rescue-reunion" | "mourning" | "shared-success" | "setback" | "danger" | "hunger-talk" | "food-search" | "quiet";
  interactionPairCharacterIds: [string, string] | null;
  animationByCharacterId: Record<string, string>;
  behaviorByCharacterId: Record<string, string>;
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function stableOrder(ids: string[], seed: string): string[] {
  return [...ids].sort((left, right) => hash(`${seed}:${left}`) - hash(`${seed}:${right}`));
}

/** Resolves one deterministic, presentation-only social beat from shared public history. */
export function deriveCrewHistoryBeat(snapshot: PublicGameSnapshot): CrewHistoryBeat {
  const event = snapshot.eventHistory.at(-1);
  const aliveIds = snapshot.characters.filter(({ status }) => status === "alive").map(({ characterId }) => characterId);
  const animationByCharacterId: Record<string, string> = {};
  const behaviorByCharacterId: Record<string, string> = {};
  const quiet: CrewHistoryBeat = { kind: "quiet", interactionPairCharacterIds: null, animationByCharacterId, behaviorByCharacterId };
  if (!event || snapshot.phase !== "reveal" && snapshot.phase !== "crashResolution") return quiet;

  if (snapshot.phase === "crashResolution" && snapshot.crashResolution) {
    const successfulAttempt = snapshot.crashResolution.attempts.find(({ outcome }) => outcome === "success");
    if (successfulAttempt) {
      animationByCharacterId[successfulAttempt.rescuerCharacterId] = "cheer";
      animationByCharacterId[successfulAttempt.targetCharacterId] = "hug";
      behaviorByCharacterId[successfulAttempt.rescuerCharacterId] = "Reuniting with the crew";
      behaviorByCharacterId[successfulAttempt.targetCharacterId] = "Reuniting with the crew";
      return { kind: "rescue-reunion", interactionPairCharacterIds: [successfulAttempt.rescuerCharacterId, successfulAttempt.targetCharacterId], animationByCharacterId, behaviorByCharacterId };
    }
  }

  const eventCue = event.resolution?.presentationCue ?? event.socialCue;
  const recentCueCount = snapshot.eventHistory.slice(0, -1).filter((candidate) => (candidate.resolution?.presentationCue ?? candidate.socialCue) === eventCue).length;
  const seed = `${event.id}:${recentCueCount}`;
  const deaths = event.resolution?.statusChanges.filter(({ after }) => after === "ghost").map(({ characterId }) => characterId) ?? event.deathCharacterIds ?? [];
  if (deaths.length > 0) {
    for (const id of deaths) animationByCharacterId[id] = "fall";
    const profilesById = new Map(CHARACTER_PROFILES.map((profile) => [profile.characterId, profile]));
    const comforter = stableOrder(aliveIds.filter((id) => profilesById.get(id)?.strengths.includes("empathetic")), seed)[0]
      ?? stableOrder(aliveIds, seed)[0];
    if (comforter) animationByCharacterId[comforter] = "depressed";
    for (const id of deaths) behaviorByCharacterId[id] = "Lost in the crash";
    if (comforter) behaviorByCharacterId[comforter] = "Mourning a crewmate";
    const pair = comforter && deaths[0] ? [comforter, deaths[0]] as [string, string] : null;
    return { kind: "mourning", interactionPairCharacterIds: pair, animationByCharacterId, behaviorByCharacterId };
  }

  const livingCharacters = snapshot.characters.filter(({ status }) => status === "alive");
  if (snapshot.phase === "reveal" && livingCharacters.length > 0 && livingCharacters.every(({ resources }) => resources.food <= 0)) {
    const [proposer, responder] = stableOrder(livingCharacters.map(({ characterId }) => characterId), seed);
    if (proposer) { animationByCharacterId[proposer] = "complain_01"; behaviorByCharacterId[proposer] = "Suggesting a terrible plan"; }
    if (responder) { animationByCharacterId[responder] = "fold_arms"; behaviorByCharacterId[responder] = "Objecting and seeking alternatives"; }
    for (const { characterId } of livingCharacters) {
      if (characterId !== proposer && characterId !== responder) {
        animationByCharacterId[characterId] = "look_around";
        behaviorByCharacterId[characterId] = "Looking for another solution";
      }
    }
    return { kind: "hunger-talk", interactionPairCharacterIds: proposer && responder ? [proposer, responder] : null, animationByCharacterId, behaviorByCharacterId };
  }

  const hungryCharacters = livingCharacters.filter(({ resources }) => resources.food <= 0);
  if (snapshot.phase === "reveal" && hungryCharacters.length > 0) {
    const [searcher] = stableOrder(hungryCharacters.map(({ characterId }) => characterId), seed);
    const companion = stableOrder(aliveIds.filter((id) => id !== searcher), seed)[0];
    if (searcher) { animationByCharacterId[searcher] = "look_around"; behaviorByCharacterId[searcher] = "Searching the area for food"; }
    if (companion) { animationByCharacterId[companion] = "agree"; behaviorByCharacterId[companion] = "Joining the food search"; }
    return { kind: "food-search", interactionPairCharacterIds: searcher && companion ? [searcher, companion] : null, animationByCharacterId, behaviorByCharacterId };
  }

  if (snapshot.phase === "reveal" && eventCue === "danger" && livingCharacters.length > 1) {
    const injured = [...livingCharacters].sort((left, right) => left.resources.health - right.resources.health || left.characterId.localeCompare(right.characterId))[0];
    if (injured && injured.resources.health < 100) {
      const profilesById = new Map(CHARACTER_PROFILES.map((profile) => [profile.characterId, profile]));
      const helpers = aliveIds.filter((id) => id !== injured.characterId && profilesById.get(id)?.strengths.includes("empathetic"));
      const helper = stableOrder(helpers.length > 0 ? helpers : aliveIds.filter((id) => id !== injured.characterId), seed)[0];
      if (helper) {
        animationByCharacterId[helper] = "agree";
        animationByCharacterId[injured.characterId] = "afraid";
        behaviorByCharacterId[helper] = "Checking on an injured crewmate";
        behaviorByCharacterId[injured.characterId] = "Recovering after the danger";
        return { kind: "danger", interactionPairCharacterIds: [helper, injured.characterId], animationByCharacterId, behaviorByCharacterId };
      }
    }
  }

  if (eventCue === "success") {
    const pair = stableOrder(aliveIds, seed).slice(0, 2);
    if (pair.length === 2) {
      animationByCharacterId[pair[0]!] = "greet_03";
      animationByCharacterId[pair[1]!] = "hug";
    }
    for (const id of aliveIds) if (!animationByCharacterId[id]) animationByCharacterId[id] = "clap";
    for (const id of aliveIds) behaviorByCharacterId[id] = "Celebrating the group win";
    return { kind: "shared-success", interactionPairCharacterIds: pair.length === 2 ? [pair[0]!, pair[1]!] : null, animationByCharacterId, behaviorByCharacterId };
  }

  if (eventCue === "setback") {
    const profilesById = new Map(CHARACTER_PROFILES.map((profile) => [profile.characterId, profile]));
    const support = stableOrder(aliveIds.filter((id) => profilesById.get(id)?.strengths.some((trait) => ["empathetic", "diplomatic", "calm", "observant", "steady"].includes(trait))), seed)[0];
    const partner = snapshot.characters.filter(({ status, characterId }) => status === "alive" && characterId !== support)
      .sort((left, right) => left.resources.morale - right.resources.morale || left.characterId.localeCompare(right.characterId))[0]?.characterId;
    if (support) { animationByCharacterId[support] = recentCueCount % 2 === 0 ? "agree" : "fold_arms"; behaviorByCharacterId[support] = "Trying to steady the crew"; }
    if (partner) { animationByCharacterId[partner] = recentCueCount % 2 === 0 ? "complain_01" : "frustrated_02"; behaviorByCharacterId[partner] = "Reacting to the setback"; }
    return { kind: "setback", interactionPairCharacterIds: support && partner ? [support, partner] : null, animationByCharacterId, behaviorByCharacterId };
  }

  if (eventCue === "danger") {
    const mostHurt = [...snapshot.characters].filter(({ status }) => status === "alive")
      .sort((left, right) => left.resources.health - right.resources.health || left.characterId.localeCompare(right.characterId))[0];
    if (mostHurt) animationByCharacterId[mostHurt.characterId] = "afraid";
    for (const id of aliveIds) {
      if (!animationByCharacterId[id]) animationByCharacterId[id] = "look_around";
      behaviorByCharacterId[id] = id === mostHurt?.characterId ? "Watching for danger" : "Keeping watch";
    }
    return { kind: "danger", interactionPairCharacterIds: null, animationByCharacterId, behaviorByCharacterId };
  }

  if (snapshot.phase === "reveal") {
    const [watcher, resting] = stableOrder(aliveIds, seed);
    if (watcher) { animationByCharacterId[watcher] = "look_around"; behaviorByCharacterId[watcher] = "Keeping watch"; }
    if (resting) { animationByCharacterId[resting] = "idle"; behaviorByCharacterId[resting] = "Catching a breath"; }
    return { kind: "quiet", interactionPairCharacterIds: null, animationByCharacterId, behaviorByCharacterId };
  }

  return quiet;
}
