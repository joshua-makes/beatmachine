/**
 * Bjorklund / Euclidean rhythm algorithm.
 * Distributes `hits` as evenly as possible across `steps`.
 * e.g. euclidean(3, 8) → [true, false, false, true, false, false, true, false]
 */
export function euclidean(hits: number, steps: number): boolean[] {
  if (steps <= 0) return [];
  const k = Math.min(Math.max(0, hits), steps);
  if (k === 0) return Array(steps).fill(false) as boolean[];
  if (k === steps) return Array(steps).fill(true) as boolean[];

  // Iterative Bjorklund: start with k "on" groups and (steps-k) "off" groups
  // then repeatedly merge shortest and longest until remainder is ≤ 1
  let ones: boolean[][] = Array.from({ length: k }, () => [true]);
  let zeros: boolean[][] = Array.from({ length: steps - k }, () => [false]);

  while (zeros.length > 1) {
    const pairable = Math.min(ones.length, zeros.length);
    const merged: boolean[][] = [];
    for (let i = 0; i < pairable; i++) {
      merged.push([...ones[i], ...zeros[i]]);
    }
    const leftOnes  = ones.length  > pairable ? ones.slice(pairable)  : [];
    const leftZeros = zeros.length > pairable ? zeros.slice(pairable) : [];

    // Decide what becomes the new "ones" and "zeros" for next round
    if (leftOnes.length >= leftZeros.length) {
      ones  = merged;
      zeros = leftOnes;
    } else {
      ones  = merged;
      zeros = leftZeros;
    }
    if (zeros.length === 0) break;
  }

  const pattern = [...ones.flat(), ...zeros.flat()];

  // Rotate so the first hit lands on step 0
  const firstHit = pattern.indexOf(true);
  if (firstHit > 0) {
    return [...pattern.slice(firstHit), ...pattern.slice(0, firstHit)];
  }
  return pattern;
}
