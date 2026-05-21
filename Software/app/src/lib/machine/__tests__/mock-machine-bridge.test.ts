import { afterEach, describe, expect, it, vi } from "vitest";
import { MockMachineGateway } from "@/lib/machine";

describe("mock machine gateway", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("simula ciclo queued -> started -> finished", async () => {
    vi.useFakeTimers();
    const gateway = new MockMachineGateway();

    const startStatus = await gateway.start({
      jobId: "cube-queued-started-finished",
      actions: [],
    });
    expect(startStatus.status).toBe("queued");

    vi.advanceTimersByTime(900);
    const startedStatus = await gateway.status("cube-queued-started-finished");
    expect(startedStatus.status).toBe("started");

    vi.advanceTimersByTime(2100);
    const finishedStatus = await gateway.status("cube-queued-started-finished");
    expect(finishedStatus.status).toBe("finished");
  });

  it("simula erro quando solicitado", async () => {
    vi.useFakeTimers();
    const gateway = new MockMachineGateway();

    await gateway.start({
      jobId: "cube-error",
      actions: [],
      simulateError: true,
    });

    vi.advanceTimersByTime(900);
    const status = await gateway.status("cube-error");
    expect(status.status).toBe("error");
    expect(status.errorMessage).toBeDefined();
  });

  it("retorna error para job inexistente", async () => {
    const gateway = new MockMachineGateway();
    const status = await gateway.status("cube-unknown");

    expect(status.status).toBe("error");
    expect(status.errorMessage).toBeDefined();
  });
});
