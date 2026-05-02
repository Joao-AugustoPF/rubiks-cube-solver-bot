import { describe, expect, it } from "vitest";
import type { Color, Face, LogicalMove } from "@/types";
import {
  applyMoves,
  createSolvedCube,
  solveCubeLogically,
  validateCubeState,
} from "@/lib/cube";

describe("cube validation and solver flow", () => {
  it("valida cubo resolvido como válido", () => {
    const result = validateCubeState(createSolvedCube());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("solver não cria movimentos para cubo já resolvido", () => {
    expect(solveCubeLogically(createSolvedCube())).toEqual([]);
  });

  it("rejeita estado incompleto", () => {
    const incompleteState = createSolvedCube() as unknown as Record<
      Face,
      Array<Color | null>
    >;
    incompleteState.F[2] = null;

    const result = validateCubeState(incompleteState);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("Estado incompleto"))).toBe(
      true,
    );
  });

  it("rejeita quando contagem por cor não é 9", () => {
    const invalidCountState = createSolvedCube() as unknown as Record<
      Face,
      Color[]
    >;
    invalidCountState.U[0] = "red";

    const result = validateCubeState(invalidCountState);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("exatamente 9 vezes"))).toBe(
      true,
    );
  });

  it("rejeita centros duplicados", () => {
    const duplicateCentersState = createSolvedCube() as unknown as Record<
      Face,
      Color[]
    >;
    duplicateCentersState.D[4] = duplicateCentersState.U[4];

    const result = validateCubeState(duplicateCentersState);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) => error.includes("centros das 6 faces")),
    ).toBe(true);
  });

  it("solver retorna sequência que resolve estado bagunçado", () => {
    const solved = createSolvedCube();
    const scramble: LogicalMove[] = ["R", "U", "R'", "U'", "F2", "L", "D'"];
    const scrambled = applyMoves(solved, scramble);

    const logicalMoves = solveCubeLogically(scrambled);
    const restored = applyMoves(scrambled, logicalMoves);

    expect(restored).toEqual(solved);
  });
});
