import { NextResponse } from "next/server";
import type { ApiErrorResponse, MachineStatusResponse } from "@/types";
import { mockMachineGateway } from "@/lib/machine";

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

  const status = await mockMachineGateway.status(jobId);
  return NextResponse.json<MachineStatusResponse>(status);
}
