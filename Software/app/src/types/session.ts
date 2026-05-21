import type { CubeState, LogicalMove } from "./cube";
import type { MachineStatus, MechanicalPlan } from "./machine";

export interface AnimationSettings {
  stepIntervalMs: number;
  autoPlay: boolean;
}

export interface SolveSession {
  jobId: string;
  createdAt: string;
  updatedAt: string;
  initialCubeState: CubeState;
  logicalMoves: LogicalMove[];
  mechanicalPlan: MechanicalPlan;
  animation: AnimationSettings;
  machineExecution?: {
    status: MachineStatus;
    updatedAt: string;
    errorMessage?: string;
  };
}

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  stepIntervalMs: 650,
  autoPlay: false,
};
