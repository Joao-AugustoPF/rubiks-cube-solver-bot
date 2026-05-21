import type { LogicalMove, MachineStatus, MechanicalPlan, SolveSession } from "@/types";
import { isValidCubeState } from "@/lib/cube";

export const SOLVE_SESSION_STORAGE_KEY = "rubiks-cube.latest-solve-session";
const MOVE_PATTERN = /^(U|R|F|D|L|B)(2|')?$/;

export function saveSolveSession(session: SolveSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SOLVE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadSolveSession(): SolveSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SOLVE_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSolveSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function updateSolveSessionMachineExecution(
  execution: NonNullable<SolveSession["machineExecution"]> & { jobId: string },
): void {
  const current = loadSolveSession();
  if (!current || current.jobId !== execution.jobId) {
    return;
  }

  saveSolveSession({
    ...current,
    updatedAt: new Date().toISOString(),
    machineExecution: {
      status: execution.status,
      updatedAt: execution.updatedAt,
      errorMessage: execution.errorMessage,
    },
  });
}

function isSolveSession(value: unknown): value is SolveSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.jobId !== "string") {
    return false;
  }
  if (!isValidCubeState(candidate.initialCubeState)) {
    return false;
  }
  if (!isLogicalMoveArray(candidate.logicalMoves)) {
    return false;
  }
  if (!isMechanicalPlan(candidate.mechanicalPlan, candidate.jobId)) {
    return false;
  }

  if (
    typeof candidate.animation !== "object" ||
    candidate.animation === null ||
    Array.isArray(candidate.animation)
  ) {
    return false;
  }

  const animation = candidate.animation as Record<string, unknown>;
  if (typeof animation.stepIntervalMs !== "number") {
    return false;
  }
  if (typeof animation.autoPlay !== "boolean") {
    return false;
  }

  if ("machineExecution" in candidate && candidate.machineExecution !== undefined) {
    if (
      typeof candidate.machineExecution !== "object" ||
      candidate.machineExecution === null ||
      Array.isArray(candidate.machineExecution)
    ) {
      return false;
    }

    const machineExecution = candidate.machineExecution as Record<string, unknown>;
    if (!isMachineStatus(machineExecution.status)) {
      return false;
    }
    if (typeof machineExecution.updatedAt !== "string") {
      return false;
    }
    if (
      "errorMessage" in machineExecution &&
      machineExecution.errorMessage !== undefined &&
      typeof machineExecution.errorMessage !== "string"
    ) {
      return false;
    }
  }

  return true;
}

function isLogicalMoveArray(value: unknown): value is LogicalMove[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string" && MOVE_PATTERN.test(item as string),
    )
  );
}

function isMachineStatus(value: unknown): value is MachineStatus {
  return (
    value === "queued" ||
    value === "started" ||
    value === "finished" ||
    value === "error"
  );
}

function isMechanicalPlan(
  value: unknown,
  expectedJobId: string,
): value is MechanicalPlan {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.jobId !== expectedJobId) {
    return false;
  }

  return Array.isArray(candidate.actions);
}
