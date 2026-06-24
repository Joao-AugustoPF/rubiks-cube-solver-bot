import type {
  MachineDeviceInfo,
  MachineGatewayMode,
  MachineProgress,
  MachineStartRequest,
  MachineStatus,
  MachineStatusResponse,
} from "@/types";
import type { MachineGateway } from "./contracts";
import { mockMachineGateway } from "./mock-machine-bridge";
import {
  getDeviceBaseUrl,
  getMachineDeviceInfo,
  getQueuedDeviceJobStatus,
  queueDeviceJob,
} from "./machine-store";

export interface MachineGatewaySelection {
  gateway: MachineGateway;
  mode: MachineGatewayMode;
  device: MachineDeviceInfo;
}

const REQUEST_TIMEOUT_MS = 8000;

export class PollingMachineGateway implements MachineGateway {
  async start(request: MachineStartRequest): Promise<MachineStatusResponse> {
    return queueDeviceJob(request);
  }

  async status(jobId: string): Promise<MachineStatusResponse> {
    return getQueuedDeviceJobStatus(jobId);
  }
}

export class Esp32MachineGateway implements MachineGateway {
  async start(request: MachineStartRequest): Promise<MachineStatusResponse> {
    const baseUrl = requireDeviceBaseUrl();
    return requestMachineStatus(`${baseUrl}/start`, {
      method: "POST",
      headers: buildDeviceHeaders(),
      body: JSON.stringify({
        jobId: request.jobId,
        notation: request.notation ?? request.logicalMoves?.join(" ") ?? "",
        actions: request.actions,
      }),
    }, request.jobId);
  }

  async status(jobId: string): Promise<MachineStatusResponse> {
    const baseUrl = requireDeviceBaseUrl();
    return requestMachineStatus(
      `${baseUrl}/status?jobId=${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: {
          "X-Device-Secret": requireDeviceSecret(),
        },
      },
      jobId,
    );
  }
}

export function getMachineGatewaySelection(): MachineGatewaySelection {
  const forcedGateway = process.env.MACHINE_GATEWAY?.trim().toLowerCase();

  if (forcedGateway === "mock") {
    return {
      gateway: mockMachineGateway,
      mode: "mock",
      device: getMachineDeviceInfo(),
    };
  }

  if (forcedGateway === "direct" || forcedGateway === "esp32") {
    return {
      gateway: new Esp32MachineGateway(),
      mode: "direct",
      device: getMachineDeviceInfo(),
    };
  }

  return {
    gateway: new PollingMachineGateway(),
    mode: "polling",
    device: getMachineDeviceInfo(),
  };
}

async function requestMachineStatus(
  url: string,
  init: RequestInit,
  fallbackJobId: string,
): Promise<MachineStatusResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const body = await readJson(response);
    const status = parseMachineStatusResponse(body, fallbackJobId);

    if (!response.ok && !status) {
      throw new Error(getErrorMessage(body, response.status));
    }

    if (!status) {
      throw new Error("Resposta inválida do ESP32.");
    }

    return status;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tempo limite ao comunicar com o ESP32.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildDeviceHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Secret": requireDeviceSecret(),
  };
}

function requireDeviceBaseUrl(): string {
  const baseUrl = getDeviceBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "ESP32 não registrado. Configure DEVICE_IP_OVERRIDE/DEVICE_BASE_URL ou aguarde o /api/device/register.",
    );
  }

  return baseUrl;
}

function requireDeviceSecret(): string {
  const secret = process.env.DEVICE_SECRET?.trim();
  if (!secret) {
    throw new Error("DEVICE_SECRET não configurado no backend Next.js.");
  }

  return secret;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseMachineStatusResponse(
  value: unknown,
  fallbackJobId: string,
): MachineStatusResponse | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status = parseMachineStatus(candidate.status);
  if (!status) {
    return null;
  }

  return {
    jobId: typeof candidate.jobId === "string" ? candidate.jobId : fallbackJobId,
    status,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
    errorMessage:
      typeof candidate.errorMessage === "string"
        ? candidate.errorMessage
        : typeof candidate.error === "string"
          ? candidate.error
          : undefined,
    progress: parseMachineProgress(candidate),
  };
}

function parseMachineProgress(
  value: Record<string, unknown>,
): MachineProgress | undefined {
  const progressSource =
    typeof value.progress === "object" &&
    value.progress !== null &&
    !Array.isArray(value.progress)
      ? (value.progress as Record<string, unknown>)
      : value;

  const totalActions = readNumber(progressSource.totalActions);
  const completedActions = readNumber(progressSource.completedActions);
  const currentActionIndex = readNumber(progressSource.currentActionIndex);

  if (totalActions === undefined && completedActions === undefined) {
    return undefined;
  }

  return {
    completedActions: completedActions ?? 0,
    totalActions: totalActions ?? 0,
    currentActionIndex,
    currentActionType:
      typeof progressSource.currentActionType === "string"
        ? progressSource.currentActionType
        : undefined,
  };
}

function parseMachineStatus(value: unknown): MachineStatus | null {
  if (
    value === "queued" ||
    value === "started" ||
    value === "finished" ||
    value === "error"
  ) {
    return value;
  }

  return null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getErrorMessage(value: unknown, statusCode: number): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `ESP32 respondeu HTTP ${statusCode}.`;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.error === "string") {
    return candidate.error;
  }
  if (typeof candidate.message === "string") {
    return candidate.message;
  }

  return `ESP32 respondeu HTTP ${statusCode}.`;
}
