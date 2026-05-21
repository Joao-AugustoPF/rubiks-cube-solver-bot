import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "rubiks-cube-resolver-bot",
    status: "ok",
    scope: {
      scanner: false,
      solver: false,
      viewer3d: false,
      esp32Firmware: false,
      machineContractMock: true,
    },
    timestamp: new Date().toISOString(),
  });
}
