export const APP_NAME = "Island of Extremely Questionable Judgment";
export const PROTOCOL_VERSION = 1 as const;

export type GamePhase = "lobby" | "intro" | "decision" | "reveal" | "ending" | "expired";
export type PlayerStatus = "alive" | "ghost";
export type ResourceKey = "food" | "health" | "morale" | "shelter";

export interface Resources {
  food: number;
  health: number;
  morale: number;
  shelter: number;
}

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
}

export interface Outcome {
  id: string;
  text: string;
  weight: number;
  resourceDeltas?: Partial<Record<ResourceKey, number>>;
  eliminateRandomLiving?: boolean;
}

export interface DecisionOption {
  id: string;
  label: string;
  outcomes: Outcome[];
}

export interface DecisionCard {
  id: string;
  prompt: string;
  options: DecisionOption[];
}

export interface EventEntry {
  id: string;
  text: string;
  createdAt: number;
}

export interface PrivateRoomState {
  code: string;
  revision: number;
  phase: GamePhase;
  createdAt: number;
  lastActivityAt: number;
  hostPlayerId: string;
  phaseEndsAt: number | null;
  players: Record<string, Player>;
  characters: Record<string, CharacterState>;
  resources: Resources;
  deck: DecisionCard[];
  decisionIndex: number;
  currentDecisionId: string | null;
  votesByPlayer: Record<string, string>;
  eligibleVoterIds: string[];
  eventHistory: EventEntry[];
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
}

export interface PublicDecision {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
}

export interface PublicGameSnapshot {
  code: string;
  revision: number;
  phase: GamePhase;
  hostPlayerId: string;
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
  resolvedOptionCounts?: Record<string, number>;
  winningOptionId?: string;
}

const sharedModelUrl = "/models/characters/daniel.glb";

export const CHARACTER_CATALOG: CharacterDefinition[] = [
  { id: "cast-ember", displayName: "Ember", modelUrl: sharedModelUrl, tint: "#e05a47" },
  { id: "cast-moss", displayName: "Moss", modelUrl: sharedModelUrl, tint: "#6f9f62" },
  { id: "cast-sun", displayName: "Sunny", modelUrl: sharedModelUrl, tint: "#e7b84d" },
  { id: "cast-tide", displayName: "Tide", modelUrl: sharedModelUrl, tint: "#4d93b6" },
  { id: "cast-plum", displayName: "Plum", modelUrl: sharedModelUrl, tint: "#93659f" },
  { id: "cast-clay", displayName: "Clay", modelUrl: sharedModelUrl, tint: "#b77b52" },
  { id: "cast-mint", displayName: "Mint", modelUrl: sharedModelUrl, tint: "#66b8a0" },
  { id: "cast-ash", displayName: "Ash", modelUrl: sharedModelUrl, tint: "#7d8584" },
];

