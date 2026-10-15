export interface RandomSource {
  next(): number;
}

export const cryptoRandom: RandomSource = {
  next: () => {
    const values = crypto.getRandomValues(new Uint32Array(1));
    return values[0]! / 2 ** 32;
  },
};

export function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return {
    next() {
      const value = values[index];
      if (value === undefined) throw new Error("The deterministic random sequence is exhausted.");
      if (value < 0 || value >= 1) throw new Error("Random values must be in [0, 1).");
      index += 1;
      return value;
    },
  };
}

export function randomIndex(length: number, random: RandomSource): number {
  if (!Number.isSafeInteger(length) || length <= 0) throw new Error("Cannot choose from an empty list.");
  const value = random.next();
  if (value < 0 || value >= 1) throw new Error("Random sources must return values in [0, 1).");
  return Math.floor(value * length);
}
