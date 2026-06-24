import { beforeEach, describe, expect, it } from "vitest";
import { POST as deviceRegisterPOST } from "@/app/api/device/register/route";
import { POST as sessionPOST } from "@/app/api/machine/session/route";
import { GET as statusGET } from "@/app/api/machine/status/route";
import { POST as startPOST } from "@/app/api/machine/start/route";
import { resetMachineStoreForTests } from "@/lib/machine/machine-store";

describe("machine api routes", () => {
  beforeEach(() => {
    resetMachineStoreForTests();
    process.env.MACHINE_GATEWAY = "mock";
  });

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

  it("POST /api/machine/start bloqueia quem não é operador", async () => {
    const request = new Request("http://localhost/api/machine/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: "cube-no-operator",
        actions: [{ type: "home", target: "all" }],
      }),
    });

    const response = await startPOST(request);
    const payload = (await response.json()) as { message: string };

    expect(response.status).toBe(423);
    expect(payload.message).toContain("controle");
  });

  it("POST /api/machine/start inicia job mock e retorna queued", async () => {
    const sessionResponse = await sessionPOST(
      new Request("http://localhost/api/machine/session", {
        method: "POST",
      }),
    );
    const operatorCookie = sessionResponse.headers.get("set-cookie")?.split(";")[0];

    const jobId = `cube-start-${Date.now()}`;
    const request = new Request("http://localhost/api/machine/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: operatorCookie ?? "",
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

  it("POST /api/device/register registra ESP32 autenticado", async () => {
    process.env.DEVICE_SECRET = "test-secret";
    const request = new Request("http://localhost/api/device/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Secret": "test-secret",
      },
      body: JSON.stringify({
        ip: "192.168.1.42",
        deviceId: "maquina-teste",
      }),
    });

    const response = await deviceRegisterPOST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      baseUrl: string;
      deviceId: string;
    };

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.baseUrl).toBe("http://192.168.1.42");
    expect(payload.deviceId).toBe("maquina-teste");
  });
});
