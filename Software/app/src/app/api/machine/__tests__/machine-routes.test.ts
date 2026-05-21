import { describe, expect, it } from "vitest";
import { GET as statusGET } from "@/app/api/machine/status/route";
import { POST as startPOST } from "@/app/api/machine/start/route";

describe("machine api routes", () => {
  it("POST /api/machine/start valida payload obrigatório", async () => {
    const request = new Request("http://localhost/api/machine/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId: "cube-invalid" }),
    });

    const response = await startPOST(request);
    const payload = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(payload.message).toContain("Payload inválido");
  });

  it("POST /api/machine/start inicia job mock e retorna queued", async () => {
    const jobId = `cube-start-${Date.now()}`;
    const request = new Request("http://localhost/api/machine/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        actions: [{ type: "home", target: "all" }],
      }),
    });

    const response = await startPOST(request);
    const payload = (await response.json()) as {
      jobId: string;
      status: string;
    };

    expect(response.status).toBe(200);
    expect(payload.jobId).toBe(jobId);
    expect(payload.status).toBe("queued");
  });

  it("GET /api/machine/status exige jobId", async () => {
    const request = new Request("http://localhost/api/machine/status", {
      method: "GET",
    });

    const response = await statusGET(request);
    const payload = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(payload.message).toContain("jobId");
  });
});
