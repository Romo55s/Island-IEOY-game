export const APP_NAME = "Island of Extremely Questionable Judgment";
export const PROTOCOL_VERSION = 4 as const;

export type GamePhase = "lobby" | "intro" | "crashItemChoice" | "crashRescueChoice" | "crashResolution" | "decision" | "assignmentResponse" | "privateChoice" | "reveal" | "ending" | "expired";
export type EndingId = "group-escape" | "solo-escape" | "no-survivors";
export type PlayerStatus = "alive" | "ghost";
export type ResourceKey = "food" | "health" | "morale" | "water" | "shelter";
export type CharacterResourceKey = Exclude<ResourceKey, "shelter">;

export interface Resources {
  shelter: number;
}

export interface CharacterResources {
  food: number;
  health: number;
  morale: number;
  water: number;
}

export const INITIAL_CHARACTER_RESOURCES: CharacterResources = { food: 50, health: 100, morale: 65, water: 50 };

export interface Player {
  id: string;
  displayName: string;
  status: PlayerStatus;
  characterId: string | null;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface CharacterDefinition {
  id: string;
  displayName: string;
  modelUrl: string;
  tint: string;
}

export interface CharacterState {
  characterId: string;
  status: PlayerStatus;
  resources: CharacterResources;
  startingItemId?: string | null;
}

export interface CrashAttemptResult {
  rescuerCharacterId: string;
  targetCharacterId: string;
  itemId: string | null;
  outcome: "success" | "miss" | "rescuer-lost" | "target-lost" | "both-lost";
  complicationText?: string;
}

export interface CrashResolution {
  attempts: CrashAttemptResult[];
  savedCharacterIds: string[];
  eliminatedCharacterIds: string[];
  summary: string;
}

export interface Outcome {
  id: string;
  text: string;
  weight: number;
  resourceDeltas?: Partial<Record<ResourceKey, number>>;
  /** Omit for a team-wide effect; shelter remains shared regardless. */
  affectedCharacterId?: string;
  eliminateRandomLiving?: boolean;
  eliminateCharacterId?: string;
  effectTarget?: "all-living" | "assigned-actor";
  motorboatEffect?: MotorboatOutcomeEffect;
}

export type MotorboatNode = "discovery" | "fuel-choice" | "repair" | "launch" | "terminal" | "complete";
export type MotorboatHull = "unknown" | "sound" | "leaking";
export type MotorboatEngine = "unknown" | "broken" | "sturdy" | "fragile";
export type MotorboatFuelVisibility = "none" | "shared" | "known-private";
export type MotorboatCompletion = "active" | EndingId;
export type MotorboatOutcomeEffect =
  | { type: "discovery"; hull: "sound" | "leaking"; repairParts: boolean; engineDiagnosed: boolean }
  | { type: "repair"; engine: "sturdy" | "fragile" }
  | { type: "launch"; mode: "group"; result: "success" | "failure" }
  | { type: "miss"; reason: "group-wait" };

export interface MotorboatRouteState {
  node: MotorboatNode;
  discovered: boolean;
  hull: MotorboatHull;
  engine: MotorboatEngine;
  fuelCharges: 0 | 1 | 2 | 3;
  fuelVisibility: MotorboatFuelVisibility;
  fuelOwnerCharacterId?: string;
  repairActorCharacterId?: string;
  activeOpportunityId?: string;
  missedOpportunityIds: string[];
  warningLevel: 0 | 1 | 2;
  completion: MotorboatCompletion;
  repairParts: boolean;
  engineDiagnosed: boolean;
}

export type PrivateChoiceOptionId = "share" | "hide" | "transfer" | "wake" | "solo" | "quiet";
export interface PendingPrivateChoice {
  id: string;
  kind: "fuel-discovery" | "launch-custodian";
  actorPlayerId: string;
  actorCharacterId: string;
  createdAt: number;
  deadlineAt: number;
  allowedOptionIds: PrivateChoiceOptionId[];
  defaultOptionId: "share" | "wake";
  response: { optionId: PrivateChoiceOptionId; targetCharacterId?: string } | null;
  publicActorCharacterId?: string;
}

export interface EscapeResult {
  type: EndingId;
  escapedCharacterIds: string[];
  strandedCharacterIds: string[];
  deadCharacterIds: string[];
  cause: "group-launch" | "solo-launch" | "storm-surge" | "all-dead";
  epilogueId: "motorboat-group-aftermath-v1" | "motorboat-selfish-aftermath-v1" | "motorboat-storm-aftermath-v1" | "motorboat-all-dead-aftermath-v1";
}

export interface PublicMotorboatRouteState {
  node: MotorboatNode;
  discovered: boolean;
  hull: MotorboatHull;
  engine: MotorboatEngine;
  fuelAvailability: MotorboatFuelVisibility;
  fuelCharges?: number;
  warningLevel: 0 | 1 | 2;
  missCount: number;
  completion: MotorboatCompletion;
}

export interface MotorboatEventFacts {
  node: MotorboatNode;
  actorCharacterId?: string;
  boatChange?: "discovered" | "fuel-shared" | "fuel-kept-private" | "repaired-sturdy" | "repaired-fragile" | "custodian-woke-group" | "launch-failed" | "solo-launch-failed" | "quiet-miss" | "escaped" | "storm-destroyed";
  opportunityId?: string;
  passengerCharacterIds?: string[];
  missNumber?: number;
  endingCause?: EscapeResult["cause"];
  fuelConsumed?: boolean;
  statusChanges?: ResolvedStatusChange[];
}

export type QualitativeRisk = "favorable" | "uncertain" | "risky";

export interface AssignmentSpec {
  roleLabel: string;
  actorSelection: "group-nominated-living";
  refusal: {
    successChanceBps: number;
    qualitativeRisk: QualitativeRisk;
    successOutcomes: Outcome[];
  };
}

export interface DecisionOption {
  id: string;
  label: string;
  outcomes: Outcome[];
  assignment?: AssignmentSpec;
}

export interface DecisionCard {
  id: string;
  prompt: string;
  options: DecisionOption[];
}

export type EventPresentationCue = "success" | "setback" | "danger" | "neutral";
export type ResourceChangeCause = "outcome" | "daily-consumption" | "starvation";
export type StatusChangeCause = "outcome" | "starvation" | "storm-surge";

export type ResolvedResourceChange =
  | {
    scope: "crew";
    resource: "shelter";
    before: number;
    after: number;
    delta: number;
    cause: "outcome";
  }
  | {
    scope: "character";
    characterId: string;
    resource: CharacterResourceKey;
    before: number;
    after: number;
    delta: number;
    cause: ResourceChangeCause;
  };

export interface ResolvedStatusChange {
  characterId: string;
  before: PlayerStatus;
  after: PlayerStatus;
  cause: StatusChangeCause;
}

export interface PendingAssignment {
  id: string;
  decisionId: string;
  optionId: string;
  actorCharacterId: string;
  actorPlayerId: string;
  roleLabel: string;
  selectionMethod: "group-nomination" | "random-fallback";
  createdAt: number;
  deadlineAt: number;
  response: "accept" | "try-refuse" | null;
}

export interface ResolvedAssignment {
  id: string;
  actorCharacterId: string;
  roleLabel: string;
  selectionMethod: "group-nomination" | "random-fallback";
  result: "accepted" | "timeout-accepted" | "refusal-succeeded" | "refusal-failed" | "actor-unavailable";
}

export interface ResolvedDecision {
  decisionId: string;
  prompt: string;
  winningOptionId: string;
  winningOptionLabel: string;
  outcomeId: string;
  outcomeText: string;
  optionResults: Array<{ optionId: string; label: string; votes: number }>;
  resourceChanges: ResolvedResourceChange[];
  statusChanges: ResolvedStatusChange[];
  affectedCharacterIds: string[];
  presentationCue: EventPresentationCue;
  assignment?: ResolvedAssignment;
  motorboat?: MotorboatEventFacts;
}

export interface EventEntry {
  id: string;
  text: string;
  createdAt: number;
  /** Structured public history for deterministic character reactions. */
  decisionId?: string;
  winningOptionId?: string;
  outcomeId?: string;
  socialCue?: EventPresentationCue;
  deathCharacterIds?: string[];
  /** Authoritative public facts for the full reveal; compact `text` remains the activity-log form. */
  resolution?: ResolvedDecision;
  motorboat?: MotorboatEventFacts;
}

export interface PrivateRoomState {
  code: string;
  revision: number;
  phase: GamePhase;
  createdAt: number;
  lastActivityAt: number;
  hostPlayerId: string;
  phaseStartedAt: number | null;
  phaseDeadlineAt: number | null;
  votingOpensAt: number | null;
  earliestResolveAt: number | null;
  /** @deprecated Use phaseDeadlineAt. Retained while the first client is migrated. */
  phaseEndsAt: number | null;
  players: Record<string, Player>;
  characters: Record<string, CharacterState>;
  resources: Resources;
  deck: DecisionCard[];
  decisionIndex: number;
  currentDecisionId: string | null;
  votesByPlayer: Record<string, string>;
  eligibleVoterIds: string[];
  crashItemOffersByPlayer?: Record<string, string[]>;
  crashItemsByPlayer?: Record<string, string>;
  rescueTargetsByPlayer?: Record<string, string>;
  crashResolution?: CrashResolution;
  eventHistory: EventEntry[];
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
  endingId?: EndingId;
  assignmentNominationsByPlayer?: Record<string, string>;
  pendingAssignment?: PendingAssignment;
  resolutionSequence?: number;
  motorboat?: MotorboatRouteState;
  pendingPrivateChoice?: PendingPrivateChoice;
  escapeResult?: EscapeResult;
}

export interface PublicDecision {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string; assignment?: { roleLabel: string; eligibleCharacterIds: string[] } }>;
}

export interface PublicGameSnapshot {
  code: string;
  revision: number;
  phase: GamePhase;
  hostPlayerId: string;
  phaseStartedAt: number | null;
  phaseDeadlineAt: number | null;
  votingOpensAt: number | null;
  earliestResolveAt: number | null;
  /** @deprecated Use phaseDeadlineAt. Retained while the first client is migrated. */
  phaseEndsAt: number | null;
  players: Player[];
  characters: CharacterState[];
  characterCatalog: CharacterDefinition[];
  resources: Resources;
  currentDecision: PublicDecision | null;
  decisionNumber: number;
  totalDecisions: number;
  eligibleVoterIds: string[];
  eventHistory: EventEntry[];
  viewer: { playerId: string; hasVoted: boolean };
  crashItemOffer?: string[];
  viewerCrashChoices?: { hasSelectedItem: boolean; hasSelectedRescueTarget: boolean; selectedItemId?: string; selectedTargetCharacterId?: string };
  crashResolution?: CrashResolution;
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
  endingId?: EndingId;
  activeAssignment?: Pick<PendingAssignment, "id" | "decisionId" | "optionId" | "actorCharacterId" | "roleLabel" | "deadlineAt">;
  viewerAssignment?: { canRespond: true; qualitativeRisk: QualitativeRisk };
  motorboat?: PublicMotorboatRouteState;
  activePrivateChoice?: Pick<PendingPrivateChoice, "id" | "kind" | "deadlineAt" | "publicActorCharacterId">;
  viewerPrivateChoice?: {
    canRespond: true;
    optionIds: PrivateChoiceOptionId[];
    transferableTargetCharacterIds?: string[];
  };
  escapeResult?: EscapeResult;
}

const sharedModelUrl = "/models/characters/daniel.glb";

export const CHARACTER_CATALOG: CharacterDefinition[] = [
  { id: "cast-daniel", displayName: "Daniel", modelUrl: sharedModelUrl, tint: "#e05a47" },
  { id: "cast-samantha", displayName: "Samantha", modelUrl: sharedModelUrl, tint: "#6f9f62" },
  { id: "cast-jim-young", displayName: "Jim Young", modelUrl: sharedModelUrl, tint: "#e7b84d" },
  { id: "cast-esther-morgan", displayName: "Esther Morgan", modelUrl: sharedModelUrl, tint: "#4d93b6" },
  { id: "cast-tim", displayName: "Tim", modelUrl: sharedModelUrl, tint: "#93659f" },
  { id: "cast-tony", displayName: "Tony", modelUrl: sharedModelUrl, tint: "#b77b52" },
  { id: "cast-michelle", displayName: "Michelle", modelUrl: sharedModelUrl, tint: "#66b8a0" },
  { id: "cast-jacob-ramirez", displayName: "Jacob Ramirez", modelUrl: sharedModelUrl, tint: "#7d8584" },
  { id: "cast-zach", displayName: "Zach", modelUrl: sharedModelUrl, tint: "#c76178" },
];

