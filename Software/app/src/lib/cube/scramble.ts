import type { Face, LogicalMove } from "@/types";

const SCRAMBLE_FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const SCRAMBLE_SUFFIXES = ["", "'", "2"] as const;

export function generateRandomScramble(
  length = 22,
  random: () => number = Math.random,
): LogicalMove[] {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error("Tamanho de scramble inválido.");
  }

  const moves: LogicalMove[] = [];
  let previousFace: Face | null = null;

  while (moves.length < length) {
    const face = pickRandom(SCRAMBLE_FACES, random);
    if (face === previousFace) {
      continue;
    }

    const suffix = pickRandom(SCRAMBLE_SUFFIXES, random);
    moves.push(`${face}${suffix}` as LogicalMove);
    previousFace = face;
  }

  return moves;
}

function pickRandom<T>(values: readonly T[], random: () => number): T {
  const index = Math.min(Math.floor(random() * values.length), values.length - 1);
  return values[index];
}
