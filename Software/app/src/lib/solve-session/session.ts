import {
  DEFAULT_ANIMATION_SETTINGS,
  type CubeState,
  type LogicalMove,
  type SolveCubeApiResponse,
  type SolveSession,
} from "@/types";
import { applyMoves, cloneCubeState } from "@/lib/cube";
import { buildMechanicalPlan } from "@/lib/machine";

export function createSolveSession(
  payload: SolveCubeApiResponse,
  overrides?: Partial<SolveSession>,
): SolveSession {
  const now = new Date().toISOString();
  const mechanicalPlan =
    overrides?.mechanicalPlan ??
    buildMechanicalPlan(payload.jobId, payload.logicalMoves);

  return {
    jobId: payload.jobId,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    initialCubeState: cloneCubeState(payload.initialCubeState),
    logicalMoves: [...payload.logicalMoves],
    mechanicalPlan,
    animation: {
      ...DEFAULT_ANIMATION_SETTINGS,
      ...(overrides?.animation ?? {}),
    },
    machineExecution: overrides?.machineExecution,
  };
}

export function getCubeStateAtMoveIndex(
  initialCubeState: CubeState,
  logicalMoves: readonly LogicalMove[],
  moveIndex: number,
): CubeState {
  if (moveIndex <= 0) {
    return cloneCubeState(initialCubeState);
  }

  const safeIndex = Math.min(moveIndex, logicalMoves.length);
  return applyMoves(initialCubeState, logicalMoves.slice(0, safeIndex));
}

export function getSolveProgress(
  logicalMoves: readonly LogicalMove[],
  moveIndex: number,
): number {
  if (logicalMoves.length === 0) {
    return 1;
  }
  return Math.min(Math.max(moveIndex, 0), logicalMoves.length) / logicalMoves.length;
}

export function getCurrentMove(
  logicalMoves: readonly LogicalMove[],
  moveIndex: number,
): LogicalMove | null {
  if (moveIndex <= 0 || logicalMoves.length === 0) {
    return null;
  }
  return logicalMoves[Math.min(moveIndex, logicalMoves.length) - 1] ?? null;
}
