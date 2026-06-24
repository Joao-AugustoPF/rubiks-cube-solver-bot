import type { CubeState, LogicalMove } from "./cube";
import type { MachineProgress, MachineStatus, MechanicalPlan } from "./machine";

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
    progress?: MachineProgress;
  };
}

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  stepIntervalMs: 650,
  autoPlay: false,
};
