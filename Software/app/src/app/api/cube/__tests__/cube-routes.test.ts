import { describe, expect, it } from "vitest";
import { createSolvedCube } from "@/lib/cube";
import { POST as validatePOST } from "@/app/api/cube/validate/route";
import { POST as solvePOST } from "@/app/api/cube/solve/route";

describe("cube api routes", () => {
  it("POST /api/cube/validate retorna valid=true para cubo válido", async () => {
    const request = new Request("http://localhost/api/cube/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cubeState: createSolvedCube() }),
    });

    const response = await validatePOST(request);
    const payload = (await response.json()) as { valid: boolean; errors: string[] };

    expect(response.status).toBe(200);
    expect(payload.valid).toBe(true);
    expect(payload.errors).toEqual([]);
  });

  it("POST /api/cube/validate retorna erro para cubo incompleto", async () => {
    const request = new Request("http://localhost/api/cube/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cubeState: {
          ...createSolvedCube(),
          F: ["green", null, "green", "green", "green", "green", "green", "green", "green"],
        },
      }),
    });

    const response = await validatePOST(request);
    const payload = (await response.json()) as { valid: boolean; errors: string[] };

    expect(response.status).toBe(400);
    expect(payload.valid).toBe(false);
    expect(payload.errors.length).toBeGreaterThan(0);
  });

  it("POST /api/cube/solve retorna contrato esperado", async () => {
    const request = new Request("http://localhost/api/cube/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cubeState: createSolvedCube() }),
    });

    const response = await solvePOST(request);
    const payload = (await response.json()) as {
      jobId: string;
      initialCubeState: unknown;
      logicalMoves: string[];
    };

    expect(response.status).toBe(200);
    expect(payload.jobId.startsWith("cube-")).toBe(true);
    expect(payload.initialCubeState).toEqual(createSolvedCube());
    expect(Array.isArray(payload.logicalMoves)).toBe(true);
    expect(payload.logicalMoves).toEqual([]);
  });
});
