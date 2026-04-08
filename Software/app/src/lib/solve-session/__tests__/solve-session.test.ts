import { describe, expect, it } from "vitest";
import type { SolveCubeApiResponse } from "@/types";
import { applyMoves, createSolvedCube, isSolvedCube } from "@/lib/cube";
import {
  createSolveSession,
  getCubeStateAtMoveIndex,
  getCurrentMove,
  getSolveProgress,
} from "@/lib/solve-session";

describe("solve session", () => {
  it("cria SolveSession consolidado com defaults", () => {
    const response: SolveCubeApiResponse = {
      jobId: "cube-001",
      initialCubeState: createSolvedCube(),
      logicalMoves: ["R", "U", "R'", "U'", "F2"],
    };

    const session = createSolveSession(response);

    expect(session.jobId).toBe("cube-001");
    expect(session.initialCubeState).toEqual(response.initialCubeState);
    expect(session.logicalMoves).toEqual(response.logicalMoves);
    expect(session.mechanicalPlan.jobId).toBe("cube-001");
    expect(session.mechanicalPlan.actions.length).toBeGreaterThan(
      response.logicalMoves.length,
    );
    expect(session.animation.stepIntervalMs).toBeGreaterThan(0);
  });

  it("calcula estado por índice e progresso", () => {
    const solved = createSolvedCube();
    const moves: SolveCubeApiResponse["logicalMoves"] = ["R", "U", "R'", "U'"];
    const scrambled = applyMoves(solved, moves);
    const solveMoves: SolveCubeApiResponse["logicalMoves"] = ["U", "R", "U'", "R'"];

    const partial = getCubeStateAtMoveIndex(scrambled, solveMoves, 2);
    const finalState = getCubeStateAtMoveIndex(
      scrambled,
      solveMoves,
      solveMoves.length,
    );

    expect(partial).not.toEqual(scrambled);
    expect(finalState).toEqual(solved);
    expect(isSolvedCube(finalState)).toBe(true);
    expect(getCurrentMove(solveMoves, 2)).toBe("R");
    expect(getSolveProgress(solveMoves, 2)).toBe(0.5);
  });
});
