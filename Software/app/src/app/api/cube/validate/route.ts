import { NextResponse } from "next/server";
import type { ApiErrorResponse, CubeValidationApiResponse } from "@/types";
import { validateCubeState } from "@/lib/cube";

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

  const candidateState = extractCubeState(body.data);
  const result = validateCubeState(candidateState);
  const response: CubeValidationApiResponse = {
    valid: result.isValid,
    errors: result.errors,
  };

  if (!result.isValid) {
    return NextResponse.json(response, { status: 400 });
  }

  return NextResponse.json(response);
}

function extractCubeState(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return payload;
  }
  if ("cubeState" in payload) {
    return (payload as { cubeState?: unknown }).cubeState;
  }
  return payload;
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
