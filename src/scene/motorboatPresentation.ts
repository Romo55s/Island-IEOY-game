import type {
  MotorboatEventFacts,
  PublicGameSnapshot,
  PublicMotorboatRouteState,
} from "../shared/domain";
import type { EncounterZoneId } from "./world/islandLevel";

export type MotorboatSceneCue = NonNullable<MotorboatEventFacts["boatChange"]>;

export type MotorboatStageRole = "motorboat-actor" | "motorboat-passenger";

export interface MotorboatScenePresentation {
  zoneId: Extract<EncounterZoneId, "motorboat_cove" | "motorboat_repair" | "motorboat_launch" | "motorboat_storm">;
  route: PublicMotorboatRouteState;
  cue: MotorboatSceneCue | null;
  eventId?: string;
  /** Publicly named assignment actor or custodian only. Never inferred from private fuel state. */
  publicActorCharacterId?: string;
  /** Authoritative public passenger set from a resolved launch. */
  passengerCharacterIds: string[];
}

const DECISION_ZONE_BY_ID: Record<string, MotorboatScenePresentation["zoneId"]> = {
  "motorboat-discovery": "motorboat_cove",
  "motorboat-repair": "motorboat_repair",
  "motorboat-recovery": "motorboat_repair",
  "motorboat-group-launch": "motorboat_launch",
};

const NODE_ZONE: Record<PublicMotorboatRouteState["node"], MotorboatScenePresentation["zoneId"]> = {
  discovery: "motorboat_cove",
  "fuel-choice": "motorboat_cove",
  repair: "motorboat_repair",
  launch: "motorboat_launch",
  terminal: "motorboat_storm",
  complete: "motorboat_launch",
};

function zoneForEvent(facts: MotorboatEventFacts): MotorboatScenePresentation["zoneId"] {
  switch (facts.boatChange) {
    case "discovered": return "motorboat_cove";
    case "fuel-shared":
    case "fuel-kept-private": return "motorboat_cove";
    case "repaired-sturdy":
    case "repaired-fragile": return "motorboat_repair";
    case "custodian-woke-group":
    case "launch-failed":
    case "solo-launch-failed":
    case "quiet-miss":
    case "escaped": return "motorboat_launch";
    case "storm-destroyed": return "motorboat_storm";
    default: return NODE_ZONE[facts.node];
  }
}

/**
 * Sanitizes authoritative route state into scene-only staging facts.
 * Deliberately does not inspect viewerPrivateChoice, so the shared 3D scene
 * cannot reveal the finder or private fuel owner to another player.
 */
export function deriveMotorboatScenePresentation(snapshot: PublicGameSnapshot): MotorboatScenePresentation | null {
  if (!snapshot.motorboat) return null;

  const latestRouteEntry = [...snapshot.eventHistory].reverse().find(({ motorboat, resolution }) => motorboat ?? resolution?.motorboat);
  const latestRouteResolution = latestRouteEntry?.resolution;
  const facts = latestRouteEntry?.motorboat ?? latestRouteResolution?.motorboat;
  const activeDecisionId = snapshot.currentDecision?.id ?? snapshot.activeAssignment?.decisionId;
  const activeDecisionZone = activeDecisionId ? DECISION_ZONE_BY_ID[activeDecisionId] : undefined;
  const privateChoiceZone = snapshot.activePrivateChoice?.kind === "launch-custodian"
    ? "motorboat_launch"
    : snapshot.activePrivateChoice?.kind === "fuel-discovery"
      ? "motorboat_cove"
      : undefined;
  const presentsLatestConsequence = snapshot.phase === "reveal" || snapshot.phase === "ending";
  const cue = presentsLatestConsequence ? facts?.boatChange ?? null : null;
  const activeRouteActor = snapshot.activeAssignment && DECISION_ZONE_BY_ID[snapshot.activeAssignment.decisionId]
    ? snapshot.activeAssignment.actorCharacterId
    : undefined;
  const publicActorCharacterId = activeRouteActor
    ?? snapshot.activePrivateChoice?.publicActorCharacterId
    ?? (presentsLatestConsequence ? facts?.actorCharacterId : undefined)
    ?? (presentsLatestConsequence && (cue === "repaired-sturdy" || cue === "repaired-fragile")
      ? latestRouteResolution?.assignment?.actorCharacterId
      : undefined);

  return {
    zoneId: activeDecisionZone ?? privateChoiceZone ?? (facts ? zoneForEvent(facts) : NODE_ZONE[snapshot.motorboat.node]),
    route: { ...snapshot.motorboat },
    cue,
    ...(cue && latestRouteEntry ? { eventId: latestRouteEntry.id } : {}),
    ...(publicActorCharacterId ? { publicActorCharacterId } : {}),
    passengerCharacterIds: presentsLatestConsequence ? [...(facts?.passengerCharacterIds ?? [])] : [],
  };
}

export function getMotorboatStageRole(
  presentation: MotorboatScenePresentation | null,
  characterId: string,
): MotorboatStageRole | undefined {
  if (!presentation) return undefined;
  if (presentation.publicActorCharacterId === characterId) return "motorboat-actor";
  if (presentation.passengerCharacterIds.includes(characterId)) return "motorboat-passenger";
  return undefined;
}

export function getMotorboatAnimation(
  presentation: MotorboatScenePresentation | null,
  characterId: string,
): { name: string; once: boolean } | null {
  if (!presentation?.cue) return null;
  const isActor = presentation.publicActorCharacterId === characterId;
  const isPassenger = presentation.passengerCharacterIds.includes(characterId);
  switch (presentation.cue) {
    case "repaired-sturdy": return isActor ? { name: "agree", once: true } : null;
    case "repaired-fragile": return isActor ? { name: "hit_to_stomach", once: true } : null;
    case "launch-failed": return isPassenger ? { name: "hit_to_stomach", once: true } : null;
    case "solo-launch-failed": return isActor || isPassenger ? { name: "hit_to_stomach", once: true } : null;
    case "quiet-miss": return isPassenger ? { name: "afraid", once: true } : null;
    case "custodian-woke-group": return isActor || isPassenger ? { name: "agree", once: true } : null;
    case "escaped": return isPassenger ? { name: "cheer", once: true } : null;
    case "storm-destroyed": return isPassenger ? { name: "afraid", once: true } : null;
    case "fuel-shared": return isActor ? { name: "agree", once: true } : null;
    case "fuel-kept-private":
    case "discovered": return null;
  }
}
