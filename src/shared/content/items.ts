import { z } from "zod";

export type ItemCategory = "survival" | "tool" | "food" | "keepsake" | "improvised";

export const SurvivalItemDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().min(1).max(40),
  category: z.enum(["survival", "tool", "food", "keepsake", "improvised"]),
  flavorText: z.string().min(1).max(160),
  assetKey: z.string().regex(/^item-[a-z0-9-]+$/).nullable(),
}).strict();

export interface SurvivalItemDefinition {
  id: string;
  displayName: string;
  category: ItemCategory;
  flavorText: string;
  /** Stable key for a later UI icon/model manifest; null means use the category fallback. */
  assetKey: string | null;
}

/** Shared pool used for every character's initial three-item offer. */
export const SURVIVAL_ITEMS: SurvivalItemDefinition[] = [
  { id: "knife", displayName: "Hunting knife", category: "tool", flavorText: "A practical blade with a suspiciously optimistic sheath.", assetKey: "item-knife" },
  { id: "lighter", displayName: "Lighter", category: "survival", flavorText: "A small flame and a large responsibility.", assetKey: "item-lighter" },
  { id: "rope", displayName: "Rope", category: "survival", flavorText: "Useful for climbing, tying, and regrettable plans.", assetKey: "item-rope" },
  { id: "binoculars", displayName: "Binoculars", category: "tool", flavorText: "See danger from a more comfortable distance.", assetKey: "item-binoculars" },
  { id: "flare", displayName: "Signal flare", category: "survival", flavorText: "A bright request for help—or attention from wildlife.", assetKey: "item-flare" },
  { id: "apple", displayName: "Apple", category: "food", flavorText: "One snack, several unanswered questions.", assetKey: "item-apple" },
  { id: "guitar", displayName: "Guitar", category: "keepsake", flavorText: "Morale support with a very limited songbook.", assetKey: "item-guitar" },
  { id: "crossbow", displayName: "Crossbow", category: "tool", flavorText: "A compact hunting tool that requires careful handling.", assetKey: "item-crossbow" },
  { id: "compound-bow", displayName: "Compound bow", category: "tool", flavorText: "Precision equipment with an intimidating learning curve.", assetKey: "item-compound-bow" },
  { id: "first-aid-kit", displayName: "First-aid kit", category: "survival", flavorText: "Bandages, antiseptic, and a reassuring label.", assetKey: "item-first-aid-kit" },
  { id: "water-bottle", displayName: "Water bottle", category: "survival", flavorText: "Empty now, but full of future potential.", assetKey: "item-water-bottle" },
  { id: "fishing-line", displayName: "Fishing line", category: "tool", flavorText: "A thin line between dinner and another meeting.", assetKey: "item-fishing-line" },
  { id: "hatchet", displayName: "Hatchet", category: "tool", flavorText: "For useful chopping and very confident gestures.", assetKey: "item-hatchet" },
  { id: "improvised-spear", displayName: "Improvised spear", category: "improvised", flavorText: "A sturdy stick improved by determination.", assetKey: "item-improvised-spear" },
  { id: "improvised-bow", displayName: "Improvised bow", category: "improvised", flavorText: "A flexible branch with an ambitious job title.", assetKey: "item-improvised-bow" },
  { id: "emergency-blanket", displayName: "Emergency blanket", category: "survival", flavorText: "Warmth, shelter, and a dramatic crinkle.", assetKey: "item-emergency-blanket" },
  { id: "seashell", displayName: "Large seashell", category: "keepsake", flavorText: "A memento that may also serve as a cup.", assetKey: "item-seashell" },
  {"id": "popcorn-basket", "displayName": "Popcorn basket", "category": "food", "flavorText": "Dinner and a front-row seat to everyone else's decisions.", "assetKey": null},
  {"id": "polo-shirt", "displayName": "Polo shirt", "category": "keepsake", "flavorText": "Business casual has survived the crash.", "assetKey": null},
  {"id": "golf-club", "displayName": "Golf club", "category": "improvised", "flavorText": "The island has hazards, but no scorecard.", "assetKey": null},
  {"id": "rubber-duck", "displayName": "Rubber duck", "category": "keepsake", "flavorText": "An experienced debugger with no survival advice.", "assetKey": null},
  {"id": "frying-pan", "displayName": "Frying pan", "category": "tool", "flavorText": "Suitable for dinner, provided dinner cooperates.", "assetKey": null},
  {"id": "office-stapler", "displayName": "Office stapler", "category": "improvised", "flavorText": "The last surviving member of office administration.", "assetKey": null},
  {"id": "beach-umbrella", "displayName": "Beach umbrella", "category": "survival", "flavorText": "Shade with a dangerously optimistic weather rating.", "assetKey": null},
  {"id": "novelty-mug", "displayName": "Novelty mug", "category": "keepsake", "flavorText": "World's Best Survivor remains an unverified claim.", "assetKey": null},
];

export function validateItemCatalog(items: readonly SurvivalItemDefinition[]): void {
  const identifiers = new Set<string>();
  for (const item of items) {
    SurvivalItemDefinitionSchema.parse(item);
    if (identifiers.has(item.id)) throw new Error(`Duplicate item ID: ${item.id}`);
    identifiers.add(item.id);
  }
  if (items.length < 3) throw new Error("The shared item catalog must contain at least three items.");
}

validateItemCatalog(SURVIVAL_ITEMS);
