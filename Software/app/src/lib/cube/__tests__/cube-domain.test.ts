import { describe, expect, it } from "vitest";
import type { LogicalMove } from "@/types";
import {
  applyMove,
  applyMoves,
  cloneCubeState,
  createSolvedCube,
  isValidCubeStateStructure,
  serializeCubeForSolver,
} from "@/lib/cube";

describe("cube domain", () => {
  it("cria um cubo resolvido com estrutura válida", () => {
    const cube = createSolvedCube();

    expect(isValidCubeStateStructure(cube)).toBe(true);
    expect(cube.U.every((color) => color === "white")).toBe(true);
    expect(cube.R.every((color) => color === "red")).toBe(true);
    expect(cube.F.every((color) => color === "green")).toBe(true);
    expect(cube.D.every((color) => color === "yellow")).toBe(true);
    expect(cube.L.every((color) => color === "orange")).toBe(true);
    expect(cube.B.every((color) => color === "blue")).toBe(true);
  });

  it("clona estado sem compartilhar referência", () => {
    const original = createSolvedCube();
    const cloned = cloneCubeState(original);

    cloned.U[0] = "red";

    expect(original.U[0]).toBe("white");
    expect(cloned.U[0]).toBe("red");
  });

  it("applyMove não muta o estado de entrada", () => {
    const original = createSolvedCube();
    const snapshot = cloneCubeState(original);

    void applyMove(original, "F");

    expect(original).toEqual(snapshot);
  });

  it("movimento seguido do inverso retorna ao estado anterior", () => {
    const solved = createSolvedCube();
    const faces: LogicalMove[] = ["U", "R", "F", "D", "L", "B"];

    for (const face of faces) {
      const moved = applyMove(solved, face);
      const reverted = applyMove(moved, `${face}'` as LogicalMove);
      expect(reverted).toEqual(solved);
    }
  });

  it("quatro giros da mesma face retornam ao estado inicial", () => {
    const solved = createSolvedCube();
    const faces: LogicalMove[] = ["U", "R", "F", "D", "L", "B"];

    for (const face of faces) {
      const result = applyMoves(solved, [face, face, face, face]);
      expect(result).toEqual(solved);
    }
  });

  it("giro duplo equivale a dois giros simples", () => {
    const solved = createSolvedCube();

    const withDouble = applyMove(solved, "R2");
    const withSingles = applyMoves(solved, ["R", "R"]);

    expect(withDouble).toEqual(withSingles);
  });

  it("sequência seguida da sequência inversa retorna ao cubo resolvido", () => {
    const solved = createSolvedCube();
    const sequence: LogicalMove[] = ["R", "U", "R'", "U'", "F2", "L", "D'"];

    const scrambled = applyMoves(solved, sequence);
    const restored = applyMoves(scrambled, invertSequence(sequence));

    expect(restored).toEqual(solved);
  });

  it("serializa cubo resolvido em ordem URFDLB", () => {
    const cube = createSolvedCube();
    const serialized = serializeCubeForSolver(cube);

    expect(serialized).toBe(
      `${"U".repeat(9)}${"R".repeat(9)}${"F".repeat(9)}${"D".repeat(9)}${"L".repeat(9)}${"B".repeat(9)}`,
    );
  });

  it("detecta estrutura inválida", () => {
    const invalidCube = {
      U: ["white"],
      R: Array(9).fill("red"),
      F: Array(9).fill("green"),
      D: Array(9).fill("yellow"),
      L: Array(9).fill("orange"),
      B: Array(9).fill("blue"),
    };

    expect(isValidCubeStateStructure(invalidCube)).toBe(false);
  });
});

function invertMove(move: LogicalMove): LogicalMove {
  if (move.endsWith("2")) {
    return move;
  }
  if (move.endsWith("'")) {
    return move.slice(0, 1) as LogicalMove;
  }
  return `${move}'` as LogicalMove;
}

function invertSequence(sequence: readonly LogicalMove[]): LogicalMove[] {
  return [...sequence].reverse().map(invertMove);
}
