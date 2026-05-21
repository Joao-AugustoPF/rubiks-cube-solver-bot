import type { MachineStartRequest, MachineStatusResponse } from "@/types";
import type { MachineGateway } from "./contracts";

type StoredJob = {
  status: MachineStatusResponse["status"];
  updatedAt: string;
  errorMessage?: string;
  startTimer?: ReturnType<typeof setTimeout>;
  finishTimer?: ReturnType<typeof setTimeout>;
};

const QUEUED_DELAY_MS = 900;
const FINISHED_DELAY_MS = 2100;

export class MockMachineGateway implements MachineGateway {
  private readonly jobs = new Map<string, StoredJob>();

  async start(request: MachineStartRequest): Promise<MachineStatusResponse> {
    const now = new Date().toISOString();
    const existing = this.jobs.get(request.jobId);
    if (existing) {
      return this.toStatusResponse(request.jobId, existing);
    }

    const stored: StoredJob = {
      status: "queued",
      updatedAt: now,
    };

    this.jobs.set(request.jobId, stored);
    this.scheduleLifecycle(request.jobId, request.simulateError ?? false);

    return this.toStatusResponse(request.jobId, stored);
  }

  async status(jobId: string): Promise<MachineStatusResponse> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        jobId,
        status: "error",
        updatedAt: new Date().toISOString(),
        errorMessage: "Job não encontrado no mock da máquina.",
      };
    }

    return this.toStatusResponse(jobId, job);
  }

  private scheduleLifecycle(jobId: string, simulateError: boolean): void {
    const startTimer = setTimeout(() => {
      const current = this.jobs.get(jobId);
      if (!current) {
        return;
      }
      if (current.status !== "queued") {
        return;
      }

      if (simulateError) {
        this.jobs.set(jobId, {
          ...current,
          status: "error",
          updatedAt: new Date().toISOString(),
          errorMessage: "Falha simulada do controlador mock.",
        });
        return;
      }

      const started: StoredJob = {
        ...current,
        status: "started",
        updatedAt: new Date().toISOString(),
      };
      this.jobs.set(jobId, started);

      const finishTimer = setTimeout(() => {
        const latest = this.jobs.get(jobId);
        if (!latest || latest.status !== "started") {
          return;
        }
        this.jobs.set(jobId, {
          ...latest,
          status: "finished",
          updatedAt: new Date().toISOString(),
        });
      }, FINISHED_DELAY_MS);

      this.jobs.set(jobId, {
        ...started,
        finishTimer,
      });
    }, QUEUED_DELAY_MS);

    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    this.jobs.set(jobId, {
      ...job,
      startTimer,
    });
  }

  private toStatusResponse(jobId: string, job: StoredJob): MachineStatusResponse {
    return {
      jobId,
      status: job.status,
      updatedAt: job.updatedAt,
      errorMessage: job.errorMessage,
    };
  }
}

export const mockMachineGateway = new MockMachineGateway();
