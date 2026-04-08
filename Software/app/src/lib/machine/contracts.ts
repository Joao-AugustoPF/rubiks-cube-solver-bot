import type { MachineStartRequest, MachineStatusResponse } from "@/types";

export interface MachineGateway {
  start(request: MachineStartRequest): Promise<MachineStatusResponse>;
  status(jobId: string): Promise<MachineStatusResponse>;
}
