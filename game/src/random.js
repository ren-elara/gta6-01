// A small seeded random number generator (mulberry32): the same seed gives the same game,
// Capture URLs supply a seed; ordinary play chooses one when the page opens.

export function normalizeSeed(value, fallback = 7) {
  // URL parameters are decimal integers. Whitespace and exponent notation should
  // not silently select a different city from the one a player meant to share.
  const bounded = (number) => Number.isInteger(number) && number >= 0 && number <= 0xffffffff;
  const safeFallback = bounded(fallback) ? fallback : 7;
  if (typeof value === 'string' && (value.length > 10 || !/^\d+$/.test(value))) return safeFallback;
  if (typeof value !== 'string' && typeof value !== 'number') return safeFallback;
  const number = Number(value);
  return bounded(number) ? number : safeFallback;
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
