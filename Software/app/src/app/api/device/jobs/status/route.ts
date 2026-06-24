import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
  DeviceStatusUpdateRequest,
  MachineStatus,
  MachineStatusResponse,
} from "@/types";
import {
  registerDevice,
  updateDeviceJobStatus,
} from "@/lib/machine/machine-store";

export async function POST(request: Request) {
  const authError = validateDeviceSecret(request);
  if (authError) {
    return authError;
  }

  const body = await readJsonBody(request);
  if (!body.ok || !isDeviceStatusUpdateRequest(body.data)) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          "Payload inválido. Informe jobId, status e progress opcional.",
      },
      { status: 400 },
    );
  }

  if (body.data.deviceId) {
    registerDevice({
      ip: request.headers.get("X-Device-IP")?.trim() || "polling",
      deviceId: body.data.deviceId,
    });
  }

  try {
    const status = updateDeviceJobStatus(body.data);
    return NextResponse.json<MachineStatusResponse>({
      ...status,
      gatewayMode: "polling",
    });
  } catch (error) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar status do job.",
      },
      { status: 404 },
    );
  }
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

function isDeviceStatusUpdateRequest(
  value: unknown,
): value is DeviceStatusUpdateRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.jobId === "string" &&
    isMachineStatus(candidate.status) &&
    (
      candidate.deviceId === undefined ||
      typeof candidate.deviceId === "string"
    ) &&
    (
      candidate.errorMessage === undefined ||
      typeof candidate.errorMessage === "string"
    ) &&
    (
      candidate.progress === undefined ||
      isMachineProgress(candidate.progress)
    )
  );
}

function isMachineStatus(value: unknown): value is MachineStatus {
  return (
    value === "queued" ||
    value === "started" ||
    value === "finished" ||
    value === "error"
  );
}

function isMachineProgress(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.completedActions === "number" &&
    typeof candidate.totalActions === "number" &&
    (
      candidate.currentActionIndex === undefined ||
      typeof candidate.currentActionIndex === "number"
    ) &&
    (
      candidate.currentActionType === undefined ||
      typeof candidate.currentActionType === "string"
    )
  );
}

function validateDeviceSecret(
  request: Request,
): NextResponse<ApiErrorResponse> | null {
  const expectedSecret = process.env.DEVICE_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: "DEVICE_SECRET não configurado no backend Next.js.",
      },
      { status: 500 },
    );
  }

  if (request.headers.get("X-Device-Secret") !== expectedSecret) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: "ESP32 não autorizado.",
      },
      { status: 401 },
    );
  }

  return null;
}
