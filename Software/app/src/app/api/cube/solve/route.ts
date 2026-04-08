import { NextResponse } from "next/server";
import type { ApiErrorResponse, SolveCubeApiResponse } from "@/types";
import {
  assertValidCubeState,
  createSolveJobResponse,
  validateCubeState,
} from "@/lib/cube";

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
  const validation = validateCubeState(candidateState);

  if (!validation.isValid) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message:
          "Estado do cubo inválido. Corrija os stickers e tente novamente.",
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  try {
    assertValidCubeState(candidateState);
    const solved = createSolveJobResponse(candidateState);
    return NextResponse.json<SolveCubeApiResponse>(solved);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao calcular solução do cubo.";

    return NextResponse.json<ApiErrorResponse>(
      {
        message,
      },
      { status: 422 },
    );
  }
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
