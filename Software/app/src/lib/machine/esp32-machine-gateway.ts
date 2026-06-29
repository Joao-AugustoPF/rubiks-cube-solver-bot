import type { MachineDeviceInfo, MachineGatewayMode } from "@/types";
import type { MachineGateway } from "./contracts";
import { mockMachineGateway } from "./mock-machine-bridge";
import { getMachineDeviceInfo } from "./machine-store";

export interface MachineGatewaySelection {
  gateway: MachineGateway;
  mode: MachineGatewayMode;
  device: MachineDeviceInfo;
}

export function getMachineGatewaySelection(): MachineGatewaySelection {
  return {
    gateway: mockMachineGateway,
    mode: "mock",
    device: getMachineDeviceInfo(),
  };
}
