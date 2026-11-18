// A small seeded random number generator (mulberry32): the same seed gives the same game,
// Capture URLs supply a seed; ordinary play chooses one when the page opens.

export function normalizeSeed(value, fallback = 7) {
  if (value === null || value === '' || !Number.isSafeInteger(Number(value))) return fallback >>> 0;
  return Number(value) >>> 0;
}

export function createRandom(seed) {
  let a = normalizeSeed(seed);
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
