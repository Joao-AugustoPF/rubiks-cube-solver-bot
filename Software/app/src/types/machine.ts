import type { CubeState, LogicalMove } from "./cube";

export type RotationDegrees = 90 | -90 | 180;

export type MechanicalHomeAction = {
  type: "home";
  target: "all";
};

export type MechanicalClampAction = {
  type: "clamp";
  name: "A" | "B";
  state: "open" | "close";
};

export type MechanicalRotateCubeAction = {
  type: "rotate_cube";
  axis: "x" | "y" | "z";
  degrees: RotationDegrees;
};

export type MechanicalTurnFaceAction = {
  type: "turn_face";
  actuator: "up" | "right" | "front" | "down" | "left" | "back";
  degrees: RotationDegrees;
};

export type MechanicalWaitAction = {
  type: "wait";
  durationMs: number;
};

export type MechanicalAction =
  | MechanicalHomeAction
  | MechanicalClampAction
  | MechanicalRotateCubeAction
  | MechanicalTurnFaceAction
  | MechanicalWaitAction;

export type MachineStatus = "queued" | "started" | "finished" | "error";

export interface MechanicalPlan {
  jobId: string;
  actions: MechanicalAction[];
}

export interface MachineStartRequest {
  jobId: string;
  notation?: string;
  actions: MechanicalAction[];
  initialCubeState?: CubeState;
  logicalMoves?: LogicalMove[];
  simulateError?: boolean;
}

export interface MachineProgress {
  currentActionIndex?: number;
  completedActions: number;
  totalActions: number;
  currentActionType?: MechanicalAction["type"] | string;
  currentLogicalMoveIndex?: number;
  totalLogicalMoves?: number;
}

export interface MachineDeviceInfo {
  connected: boolean;
  deviceId?: string;
  ip?: string;
  baseUrl?: string;
  lastSeenAt?: string;
}

export interface MachineStatusResponse {
  jobId: string;
  status: MachineStatus;
  updatedAt: string;
  errorMessage?: string;
  progress?: MachineProgress;
  currentCubeState?: CubeState;
  gatewayMode?: "mock" | "esp32";
  device?: MachineDeviceInfo;
}

export interface MachineControlSessionResponse {
  isOperator: boolean;
  operatorLeaseExpiresAt?: string;
  activeSession?: import("./session").SolveSession;
  gatewayMode?: "mock" | "esp32";
  device?: MachineDeviceInfo;
  message?: string;
}
