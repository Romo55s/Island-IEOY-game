/** Initial design tuning; keep probabilities and costs together for playtest adjustments. */
export const DESPERATION = {
  groupWeights: [45, 35, 20], nightWeights: [20, 50, 30],
  searchChanceBps: 6500, searchFood: 8, searchMorale: -2,
  groupFood: 25, groupMorale: -15, resistanceDamage: 10, resistanceMorale: -8, backDownMorale: -5,
  nightFood: 35, actorMorale: -10, witnessMorale: -15, knockoutDamage: 15,
  maxGroupOffers: 2, maxNightOffers: 2, privateDurationMs: 15000,
} as const;
