import { NextResponse } from "next/server";
import type { ApiErrorResponse, DeviceJobResponse } from "@/types";
import {
  claimNextDeviceJob,
  registerDevice,
} from "@/lib/machine/machine-store";

export async function GET(request: Request) {
  const authError = validateDeviceSecret(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId")?.trim() || "rubik-solver-01";
  const ip = request.headers.get("X-Device-IP")?.trim() || "polling";

  registerDevice({ ip, deviceId });

  return NextResponse.json<DeviceJobResponse>(claimNextDeviceJob(deviceId));
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
