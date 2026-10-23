import type { SurvivalItemDefinition } from "../content/items";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";

export const STARTING_ITEM_OFFER_SIZE = 3;

/** Uniformly draw distinct items for one player; separate calls may return overlapping items. */
export function drawStartingItemOffer(
  catalog: readonly SurvivalItemDefinition[],
  random: RandomSource,
): SurvivalItemDefinition[] {
  if (catalog.length < STARTING_ITEM_OFFER_SIZE) {
    throw new Error(`The item catalog must contain at least ${STARTING_ITEM_OFFER_SIZE} items.`);
  }
  const ids = new Set(catalog.map(({ id }) => id));
  if (ids.size !== catalog.length) throw new Error("The item catalog must not contain duplicate IDs.");

  const remaining = [...catalog];
  const offer: SurvivalItemDefinition[] = [];
  for (let index = 0; index < STARTING_ITEM_OFFER_SIZE; index += 1) {
    offer.push(remaining.splice(randomIndex(remaining.length, random), 1)[0]!);
  }
  return offer;
}
