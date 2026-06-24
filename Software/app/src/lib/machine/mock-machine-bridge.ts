import type { MachineStartRequest, MachineStatusResponse } from "@/types";
import type { MachineGateway } from "./contracts";

type StoredJob = {
  status: MachineStatusResponse["status"];
  updatedAt: string;
  errorMessage?: string;
  currentActionIndex: number;
  completedActions: number;
  totalActions: number;
  currentActionType?: string;
  startTimer?: ReturnType<typeof setTimeout>;
  progressTimer?: ReturnType<typeof setInterval>;
};

const QUEUED_DELAY_MS = 900;
const ACTION_DELAY_MS = 420;

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
      currentActionIndex: 0,
      completedActions: 0,
      totalActions: request.actions.length,
    };

    this.jobs.set(request.jobId, stored);
    this.scheduleLifecycle(
      request.jobId,
      request.actions.map((action) => action.type),
      request.simulateError ?? false,
    );

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

  private scheduleLifecycle(
    jobId: string,
    actionTypes: string[],
    simulateError: boolean,
  ): void {
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
        currentActionIndex: 0,
        completedActions: 0,
        currentActionType: actionTypes[0],
      };
      this.jobs.set(jobId, started);

      const progressTimer = setInterval(() => {
        const latest = this.jobs.get(jobId);
        if (!latest || latest.status !== "started") {
          clearInterval(progressTimer);
          return;
        }

        const completedActions = Math.min(
          latest.completedActions + 1,
          latest.totalActions,
        );
        const isFinished = completedActions >= latest.totalActions;
        const currentActionIndex = isFinished
          ? Math.max(latest.totalActions - 1, 0)
          : completedActions;

        if (isFinished) {
          clearInterval(progressTimer);
        }

        this.jobs.set(jobId, {
          ...latest,
          status: isFinished ? "finished" : "started",
          updatedAt: new Date().toISOString(),
          completedActions,
          currentActionIndex,
          currentActionType: actionTypes[currentActionIndex],
          progressTimer: isFinished ? undefined : progressTimer,
        });
      }, ACTION_DELAY_MS);

      this.jobs.set(jobId, {
        ...started,
        progressTimer,
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
      progress: {
        currentActionIndex: job.currentActionIndex,
        completedActions: job.completedActions,
        totalActions: job.totalActions,
        currentActionType: job.currentActionType,
      },
    };
  }
}

export const mockMachineGateway = new MockMachineGateway();
