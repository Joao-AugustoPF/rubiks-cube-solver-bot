import Cube from "cubejs";
import type { CubeState, LogicalMove } from "@/types";
import { applyMoves } from "./moves";
import { isSolvedCube } from "./solved";
import { cloneCubeState } from "./state";
import { serializeCubeForSolver } from "./serializer";
import { assertValidCubeState } from "./validation";

const LOGICAL_MOVE_PATTERN = /^(U|R|F|D|L|B)(2|')?$/;

let isSolverInitialized = false;

function ensureSolverInitialized(): void {
  if (isSolverInitialized) {
    return;
  }
  Cube.initSolver();
  isSolverInitialized = true;
}

export function solveCubeLogically(cubeState: CubeState): LogicalMove[] {
  assertValidCubeState(cubeState, "Não foi possível enviar o cubo para o solver.");

  if (isSolvedCube(cubeState)) {
    return [];
  }

  ensureSolverInitialized();

  const serialized = serializeCubeForSolver(cubeState);

  try {
    const cube = Cube.fromString(serialized);
    const rawSolution = cube.solve();
    const logicalMoves = parseSolverMoves(rawSolution);

    if (!isSolvedCube(applyMoves(cubeState, logicalMoves))) {
      throw new Error("solver returned a sequence that does not solve the cube");
    }

    return logicalMoves;
  } catch {
    throw new Error(
      "Estado de cubo inválido para solução. Verifique se a combinação é solucionável.",
    );
  }
}

export function createSolveJobResponse(cubeState: CubeState): {
  jobId: string;
  initialCubeState: CubeState;
  logicalMoves: LogicalMove[];
} {
  const logicalMoves = solveCubeLogically(cubeState);

  return {
    jobId: createJobId(),
    initialCubeState: cloneCubeState(cubeState),
    logicalMoves,
  };
}

function createJobId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `cube-${Date.now()}-${random}`;
}

function parseSolverMoves(rawSolution: string): LogicalMove[] {
  const normalized = rawSolution.trim();
  if (normalized.length === 0) {
    return [];
  }

  return normalized.split(/\s+/).map((move) => {
    if (!LOGICAL_MOVE_PATTERN.test(move)) {
      throw new Error(`Movimento retornado pelo solver inválido: ${move}`);
    }
    return move as LogicalMove;
  });
}
