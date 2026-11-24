/** Shared musical identity for Island After Impact and its gameplay variations. */
export const ISLAND_AFTER_IMPACT_MOTIF = ["D5", "F5", "Eb5", "D5"] as const;

/** The title score's underlying eight-bar harmony, from which cues take sections. */
export const ISLAND_AFTER_IMPACT_HARMONY: readonly (readonly string[])[] = [
  ["D3", "A3", "D4", "E4", "F4"],
  ["D3", "A3", "Bb3", "D4", "F4"],
  ["C3", "G3", "A3", "C4", "E4"],
  ["C3", "G3", "Bb3", "D4", "F4"],
  ["D3", "G3", "Bb3", "D4", "A4"],
  ["D3", "A3", "C4", "D4", "F4"],
  ["D3", "A3", "Bb3", "D4", "F4"],
  ["A2", "E3", "G3", "Bb3", "C#4"],
];

export const ISLAND_AFTER_IMPACT_BASS = ["D2", "D2", "Bb1", "C2", "G1", "D2", "Bb1", "A1"] as const;
