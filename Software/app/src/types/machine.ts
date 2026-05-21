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
  actions: MechanicalAction[];
  simulateError?: boolean;
}

export interface MachineStatusResponse {
  jobId: string;
  status: MachineStatus;
  updatedAt: string;
  errorMessage?: string;
}
