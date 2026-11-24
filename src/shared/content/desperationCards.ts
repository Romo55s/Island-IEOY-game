import type { DecisionCard } from "../domain";

export function createHungerCrisisCard(): DecisionCard {
  return { id: "camp-hunger-crisis", kind: "hunger-crisis", prompt: "At least half the living crew is starving. Search for food, or choose someone to eat? With no votes, both the plan and any target are chosen randomly.", options: [
    { id: "search", label: "Search for food together · Uncertain", outcomes: [] },
    { id: "attempt", label: "Choose someone to eat · Risky", targetSelection: { label: "Choose the intended victim" }, outcomes: [] },
  ] };
}
