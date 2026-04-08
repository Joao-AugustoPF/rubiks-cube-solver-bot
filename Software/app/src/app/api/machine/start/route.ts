import { NextResponse } from "next/server";
import type { ApiErrorResponse, MachineStartRequest, MachineStatusResponse } from "@/types";
import { mockMachineGateway } from "@/lib/machine";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: "Requisição inválida. Envie um JSON válido.",
      },
      { status: 400 },
    );
  }

  if (!isMachineStartRequest(body.data)) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          "Payload inválido para início da máquina. Informe jobId e actions.",
      },
      { status: 400 },
    );
  }

  const status = await mockMachineGateway.start(body.data);
  return NextResponse.json<MachineStatusResponse>(status);
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}

function isMachineStartRequest(value: unknown): value is MachineStartRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.jobId === "string" && Array.isArray(candidate.actions);
}
