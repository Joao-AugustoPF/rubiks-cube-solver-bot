import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
  MachineStartRequest,
  MachineStatusResponse,
  SolveSession,
} from "@/types";
import { isValidCubeState } from "@/lib/cube";
import { DEFAULT_ANIMATION_SETTINGS } from "@/types";
import { getMachineGatewaySelection } from "@/lib/machine/esp32-machine-gateway";
import {
  buildOperatorCookie,
  enrichMachineStatus,
  getOperatorTokenFromRequest,
  refreshOperatorLease,
  setActiveMachineSession,
} from "@/lib/machine/machine-store";

const MOVE_PATTERN = /^(U|R|F|D|L|B)(2|')?$/;

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

  const gatewaySelection = getMachineGatewaySelection();
  const isMockExecution = gatewaySelection.mode === "mock";
  const operator = refreshOperatorLease(getOperatorTokenFromRequest(request));

  if (!isMockExecution && !operator.isOperator) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          operator.message ??
          "Somente a aba operadora pode iniciar a execução da máquina.",
      },
      { status: 423 },
    );
  }

  let status: MachineStatusResponse;

  try {
    status = await gatewaySelection.gateway.start(body.data);
  } catch (error) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao comunicar com a máquina.",
      },
      { status: 502 },
    );
  }

  const activeSession = createActiveSession(body.data, status);
  if (activeSession) {
    setActiveMachineSession(activeSession);
  }

  const response = NextResponse.json<MachineStatusResponse>({
    ...enrichMachineStatus(status),
    gatewayMode: gatewaySelection.mode,
    device: gatewaySelection.device,
  });
  if (!isMockExecution && operator.operatorToken) {
    response.headers.append("Set-Cookie", buildOperatorCookie(operator.operatorToken));
  }

  return response;
}

function createActiveSession(
  request: MachineStartRequest,
  status: MachineStatusResponse,
): SolveSession | null {
  if (!request.initialCubeState || !request.logicalMoves) {
    return null;
  }
  if (!isValidCubeState(request.initialCubeState)) {
    return null;
  }
  if (!isLogicalMoveArray(request.logicalMoves)) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    jobId: request.jobId,
    createdAt: now,
    updatedAt: now,
    initialCubeState: request.initialCubeState,
    logicalMoves: [...request.logicalMoves],
    mechanicalPlan: {
      jobId: request.jobId,
      actions: [...request.actions],
    },
    animation: DEFAULT_ANIMATION_SETTINGS,
    machineExecution: {
      status: status.status,
      updatedAt: status.updatedAt,
      errorMessage: status.errorMessage,
      progress: status.progress,
    },
  };
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
  if (typeof candidate.jobId !== "string" || !Array.isArray(candidate.actions)) {
    return false;
  }
  if (
    "notation" in candidate &&
    candidate.notation !== undefined &&
    typeof candidate.notation !== "string"
  ) {
    return false;
  }
  if (
    "initialCubeState" in candidate &&
    candidate.initialCubeState !== undefined &&
    !isValidCubeState(candidate.initialCubeState)
  ) {
    return false;
  }
  if (
    "logicalMoves" in candidate &&
    candidate.logicalMoves !== undefined &&
    !isLogicalMoveArray(candidate.logicalMoves)
  ) {
    return false;
  }

  return true;
}

function isLogicalMoveArray(value: unknown): value is NonNullable<MachineStartRequest["logicalMoves"]> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string" && MOVE_PATTERN.test(item as string),
    )
  );
}
