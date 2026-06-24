import { NextResponse } from "next/server";
import type { ApiErrorResponse, MachineStatusResponse } from "@/types";
import { getMachineGatewaySelection } from "@/lib/machine/esp32-machine-gateway";
import { enrichMachineStatus } from "@/lib/machine/machine-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: "Informe o parâmetro jobId para consultar status da máquina.",
      },
      { status: 400 },
    );
  }

  const gatewaySelection = getMachineGatewaySelection();
  let status: MachineStatusResponse;

  try {
    status = await gatewaySelection.gateway.status(jobId);
  } catch (error) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao consultar status da máquina.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json<MachineStatusResponse>({
    ...enrichMachineStatus(status),
    gatewayMode: gatewaySelection.mode,
    device: gatewaySelection.device,
  });
}
