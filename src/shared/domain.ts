import type { DesperationState, DesperationEventFacts } from "./desperation/types";
export const APP_NAME = "Island of Extremely Questionable Judgment";
export const PROTOCOL_VERSION = 7 as const;

export type GamePhase = "lobby" | "intro" | "crashItemChoice" | "crashRescueChoice" | "crashResolution" | "decision" | "assignmentResponse" | "privateChoice" | "reveal" | "ending" | "expired";
export type EndingId = "group-escape" | "solo-escape" | "signal-rescue" | "no-survivors";
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
  campaignEffect?: CampaignOutcomeEffect;
}

export type CampaignNodeId =
  | "shoreline-priority" | "first-night" | "daybreak-survey" | "freshwater-run"
  | "bear-encounter" | "wildlife-encounter" | "medical-triage" | "cave-expedition" | "shelter-reinforcement"
  | "crew-council" | "storm-warning" | "escape-project" | "signal-preparation"
  | "signal-approach" | "signal-window" | "signal-attempt" | "coastal-expedition" | "coastal-hazard" | "motorboat" | "complete";
export type CampaignStoryFlag =
  | "wreck-supplies" | "freshwater-found" | "boar-distracted" | "boar-driven-off"
  | "cave-supplies" | "cave-disturbed" | "shelter-reinforced" | "crew-unified"
  | "storm-shelter" | "signal-kit-prepared" | "coast-route-marked" | "coast-injured"
  | "clear-signal-window" | "storm-gust" | "bear-defeated";
export interface CampaignState {
  node: CampaignNodeId;
  radioRecovered: boolean;
  radioRepaired: boolean;
  shelterSecured: boolean;
  coveLocated: boolean;
  lookoutSent: boolean;
  flareConsumed: boolean;
  signalAttempted: boolean;
  signalFailed: boolean;
  signalPosition: "unselected" | "low" | "ridge";
  coveReached: boolean;
  storyFlags: CampaignStoryFlag[];
  decisionsSinceFoodTick: 0 | 1 | 2;
}
export interface PublicCampaignState extends Omit<CampaignState, "node"> {
  node: CampaignNodeId;
}
export type CampaignOutcomeEffect =
  | { type: "shoreline"; choice: "salvage" | "shelter" | "scout" }
  | { type: "preparation"; choice: "radio-repaired" | "radio-failed" | "rested" | "lookout" | "foraged" }
  | { type: "route-choice"; route: "signal" | "motorboat" }
  | { type: "signal-attempt"; method: "radio" | "flare" | "smoke"; result: "success" | "failure" }
  | { type: "story-beat"; nextNode: CampaignNodeId; choice: string; addFlag?: CampaignStoryFlag; signalPosition?: "low" | "ridge"; coveReached?: true };
export interface CampaignEventFacts {
  node: CampaignNodeId;
  choice: string;
  result?: "success" | "failure";
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

export type PrivateChoiceOptionId = "share" | "hide" | "transfer" | "wake" | "solo" | "quiet" | "sleep" | "attempt-eat";
export interface PendingPrivateChoice {
  id: string;
  kind: "fuel-discovery" | "launch-custodian" | "night-hunger";
  actorPlayerId: string;
  actorCharacterId: string;
  createdAt: number;
  deadlineAt: number;
  allowedOptionIds: PrivateChoiceOptionId[];
  defaultOptionId: "share" | "wake" | "sleep";
  response: { optionId: PrivateChoiceOptionId; targetCharacterId?: string } | null;
  publicActorCharacterId?: string;
}

export interface EscapeResult {
  type: EndingId;
  escapedCharacterIds: string[];
  strandedCharacterIds: string[];
  deadCharacterIds: string[];
  cause: "group-launch" | "solo-launch" | "signal-rescue" | "storm-surge" | "all-dead";
  epilogueId: "motorboat-group-aftermath-v1" | "motorboat-selfish-aftermath-v1" | "signal-rescue-aftermath-v1" | "motorboat-storm-aftermath-v1" | "motorboat-all-dead-aftermath-v1";
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
  endingCause?: Exclude<EscapeResult["cause"], "signal-rescue">;
  fuelConsumed?: boolean;
  statusChanges?: ResolvedStatusChange[];
}

export type QualitativeRisk = "favorable" | "uncertain" | "risky";

export interface AssignmentSpec {
  requiredStartingItemId?: string;
  roleLabel: string;
  actorSelection: "group-nominated-living";
  refusal: {
    successChanceBps: number;
    qualitativeRisk: QualitativeRisk;
    successOutcomes: Outcome[];
  };
}

export interface DecisionOption {
  targetSelection?: { label: string };
  id: string;
  label: string;
  outcomes: Outcome[];
  assignment?: AssignmentSpec;
}

export interface DecisionCard {
  kind?: "normal" | "hunger-crisis";
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
  desperation?: DesperationEventFacts;
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
  campaign?: CampaignEventFacts;
}

export interface CrewDialogueLine {
  characterId: string;
  text: string;
  emotion: "neutral" | "happy" | "sad" | "afraid" | "angry" | "relieved";
  animation: "idle" | "agree" | "laugh" | "celebrate" | "sad" | "concern";
}

export interface CrewDialogueExchange {
  id: string;
  templateId: string;
  motifIds?: string[];
  lines: CrewDialogueLine[];
}

export interface EventEntry {
  desperation?: DesperationEventFacts;
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
  campaign?: CampaignEventFacts;
  crewDialogue?: CrewDialogueExchange;
}

export interface PrivateRoomState {
  desperation?: DesperationState;
  targetNominationsByPlayer?: Record<string, string>;
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
  activeCrewDialogue?: CrewDialogueExchange;
  recentPromptDialogues?: CrewDialogueExchange[];
  eventHistory: EventEntry[];
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
  endingId?: EndingId;
  assignmentNominationsByPlayer?: Record<string, string>;
  pendingAssignment?: PendingAssignment;
  resolutionSequence?: number;
  motorboat?: MotorboatRouteState;
  campaign?: CampaignState;
  pendingPrivateChoice?: PendingPrivateChoice;
  escapeResult?: EscapeResult;
}

export interface PublicDecision {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string; targetSelection?: { label: string; eligibleCharacterIds: string[] }; assignment?: { roleLabel: string; eligibleCharacterIds: string[] } }>;
}

export interface PublicLiveVote {
  targetCharacterId?: string;
  playerId: string;
  optionId: string;
  assignedCharacterId?: string;
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
  activeCrewDialogue?: CrewDialogueExchange;
  viewer: { playerId: string; hasVoted: boolean };
  /** Public group ballots while a decision is open. Private-choice responses never appear here. */
  liveVotes?: PublicLiveVote[];
  crashItemOffer?: string[];
  viewerCrashChoices?: { hasSelectedItem: boolean; hasSelectedRescueTarget: boolean; selectedItemId?: string; selectedTargetCharacterId?: string };
  crashResolution?: CrashResolution;
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
  endingId?: EndingId;
  activeAssignment?: Pick<PendingAssignment, "id" | "decisionId" | "optionId" | "actorCharacterId" | "roleLabel" | "deadlineAt">;
  viewerAssignment?: { canRespond: true; qualitativeRisk: QualitativeRisk };
  motorboat?: PublicMotorboatRouteState;
  campaign?: PublicCampaignState;
  activePrivateChoice?: Pick<PendingPrivateChoice, "id" | "kind" | "deadlineAt" | "publicActorCharacterId">;
  viewerPrivateChoice?: {
    canRespond: true;
    optionIds: PrivateChoiceOptionId[];
    transferableTargetCharacterIds?: string[];
    targetCharacterIds?: string[];
  };
  escapeResult?: EscapeResult;
}

export const CHARACTER_CATALOG: CharacterDefinition[] = [
  { id: "cast-daniel", displayName: "Daniel", modelUrl: "/models/characters/daniel.glb", tint: "#e05a47" },
  { id: "cast-samantha", displayName: "Samantha", modelUrl: "/models/characters/samantha-raut.glb", tint: "#6f9f62" },
  { id: "cast-jim-young", displayName: "Jim Young", modelUrl: "/models/characters/jim-young.glb", tint: "#e7b84d" },
  { id: "cast-esther-morgan", displayName: "Esther Morgan", modelUrl: "/models/characters/esther-morgan.glb", tint: "#4d93b6" },
  { id: "cast-tim", displayName: "Tim", modelUrl: "/models/characters/tim-corrigan.glb", tint: "#93659f" },
  { id: "cast-tony", displayName: "Tony", modelUrl: "/models/characters/tony.glb", tint: "#b77b52" },
  { id: "cast-michelle", displayName: "Michelle", modelUrl: "/models/characters/michelle.glb", tint: "#66b8a0" },
  { id: "cast-jacob-ramirez", displayName: "Jacob Ramirez", modelUrl: "/models/characters/jacob-ramirez.glb", tint: "#7d8584" },
  { id: "cast-zach", displayName: "Zach", modelUrl: "/models/characters/zach.glb", tint: "#c76178" },
  { id: "cast-jessica-adlock", displayName: "Jessica Adlock", modelUrl: "/models/characters/jessica-adlock.glb", tint: "#d17673" },
  { id: "cast-jorge", displayName: "Jorge", modelUrl: "/models/characters/jorge.glb?v=reimport1", tint: "#668b9e" },
  { id: "cast-maria", displayName: "Maria", modelUrl: "/models/characters/maria.glb?v=reimport1", tint: "#b57a91" },
  { id: "cast-richard-wang", displayName: "Richard Wang", modelUrl: "/models/characters/richard-wang.glb", tint: "#8b9a76" },
  { id: "cast-steve", displayName: "Steve", modelUrl: "/models/characters/steve.glb", tint: "#b88956" },
  { id: "cast-walter", displayName: "Walter", modelUrl: "/models/characters/walter.glb", tint: "#8981a5" },
  { id: "cast-courtney", displayName: "Courtney", modelUrl: "/models/characters/courtney.glb", tint: "#4e8b80" },
];

/** A room has one player slot for each selectable character. */
export const MAX_PLAYER_COUNT = CHARACTER_CATALOG.length;

