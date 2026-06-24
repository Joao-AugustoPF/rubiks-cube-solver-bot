import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types";
import { registerDevice } from "@/lib/machine/machine-store";

interface DeviceRegisterResponse {
  ok: true;
  deviceId: string;
  ip: string;
  baseUrl: string;
  lastSeenAt: string;
}

export async function POST(request: Request) {
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

  const body = await readJsonBody(request);
  if (!body.ok || !isDeviceRegisterBody(body.data)) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: "Payload inválido. Informe ip e, opcionalmente, deviceId.",
      },
      { status: 400 },
    );
  }

  const device = registerDevice(body.data);

  return NextResponse.json<DeviceRegisterResponse>(
    {
      ok: true,
      deviceId: device.deviceId,
      ip: device.ip,
      baseUrl: device.baseUrl,
      lastSeenAt: device.lastSeenAt,
    },
    { status: 201 },
  );
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

function isDeviceRegisterBody(
  value: unknown,
): value is { ip: string; deviceId?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ip === "string" &&
    candidate.ip.trim().length > 0 &&
    (
      candidate.deviceId === undefined ||
      typeof candidate.deviceId === "string"
    )
  );
}
