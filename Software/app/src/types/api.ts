import type { CubeState, LogicalMove } from "./cube";

export interface CubeValidationApiResponse {
  valid: boolean;
  errors: string[];
}

export interface SolveCubeApiResponse {
  jobId: string;
  initialCubeState: CubeState;
  logicalMoves: LogicalMove[];
}

export interface ApiErrorResponse {
  message: string;
  errors?: string[];
}
