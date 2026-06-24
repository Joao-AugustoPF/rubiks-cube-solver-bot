import { NextResponse } from "next/server";
import type { MachineControlSessionResponse } from "@/types";
import { getMachineGatewaySelection } from "@/lib/machine/esp32-machine-gateway";
import {
  buildOperatorCookie,
  buildOperatorDeleteCookie,
  claimOperator,
  getActiveMachineSession,
  getOperatorSnapshot,
  getOperatorTokenFromRequest,
  releaseOperator,
} from "@/lib/machine/machine-store";

export async function GET(request: Request) {
  return NextResponse.json<MachineControlSessionResponse>(
    buildControlSessionResponse(
      getOperatorSnapshot(getOperatorTokenFromRequest(request)),
    ),
  );
}

export async function POST(request: Request) {
  const operator = claimOperator(getOperatorTokenFromRequest(request));
  const response = NextResponse.json<MachineControlSessionResponse>(
    buildControlSessionResponse(operator),
  );

  if (operator.operatorToken) {
    response.headers.append("Set-Cookie", buildOperatorCookie(operator.operatorToken));
  }

  return response;
}

export async function DELETE(request: Request) {
  const released = releaseOperator(getOperatorTokenFromRequest(request));
  const response = NextResponse.json<MachineControlSessionResponse>(
    buildControlSessionResponse({
      isOperator: false,
      message: released
        ? "Controle liberado."
        : "Esta aba não estava com o controle.",
    }),
  );

  if (released) {
    response.headers.append("Set-Cookie", buildOperatorDeleteCookie());
  }

  return response;
}

function buildControlSessionResponse(operator: {
  isOperator: boolean;
  expiresAt?: string;
  message?: string;
}): MachineControlSessionResponse {
  const gatewaySelection = getMachineGatewaySelection();

  return {
    isOperator: operator.isOperator,
    operatorLeaseExpiresAt: operator.expiresAt,
    activeSession: getActiveMachineSession() ?? undefined,
    gatewayMode: gatewaySelection.mode,
    device: gatewaySelection.device,
    message: operator.message,
  };
}
