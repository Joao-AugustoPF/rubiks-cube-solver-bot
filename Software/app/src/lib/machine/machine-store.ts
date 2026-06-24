import type {
  DeviceJobResponse,
  DeviceStatusUpdateRequest,
  MachineDeviceInfo,
  MachineProgress,
  MachineStartRequest,
  MachineStatusResponse,
  MechanicalAction,
  SolveSession,
} from "@/types";
import { getCubeStateAtMoveIndex } from "@/lib/solve-session";

export const MACHINE_OPERATOR_COOKIE = "rubik_solver_operator";

interface OperatorLease {
  token: string;
  acquiredAt: number;
  refreshedAt: number;
  expiresAt: number;
}

interface RegisteredDevice {
  deviceId: string;
  ip: string;
  baseUrl: string;
  lastSeenAt: string;
}

interface QueuedDeviceJob {
  jobId: string;
  notation: string;
  actions: MechanicalAction[];
  status: MachineStatusResponse["status"];
  errorMessage?: string;
  progress: MachineProgress;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
}

interface MachineStore {
  activeSession: SolveSession | null;
  operatorLease: OperatorLease | null;
  registeredDevice: RegisteredDevice | null;
  deviceJobs: Map<string, QueuedDeviceJob>;
}

interface OperatorClaim {
  isOperator: boolean;
  operatorToken?: string;
  expiresAt?: string;
  message?: string;
}

const DEFAULT_OPERATOR_LEASE_MS = 30 * 60 * 1000;

const globalStore = globalThis as typeof globalThis & {
  __rubiksMachineStore?: MachineStore;
};

function getStore(): MachineStore {
  if (!globalStore.__rubiksMachineStore) {
    globalStore.__rubiksMachineStore = {
      activeSession: null,
      operatorLease: null,
      registeredDevice: null,
      deviceJobs: new Map(),
    };
  }
  if (!globalStore.__rubiksMachineStore.deviceJobs) {
    globalStore.__rubiksMachineStore.deviceJobs = new Map();
  }

  return globalStore.__rubiksMachineStore;
}

export function getOperatorTokenFromRequest(request: Request): string | undefined {
  return getCookieValue(request.headers.get("cookie"), MACHINE_OPERATOR_COOKIE);
}

export function buildOperatorCookie(token: string): string {
  const attributes = [
    `${MACHINE_OPERATOR_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${getOperatorLeaseSeconds()}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function buildOperatorDeleteCookie(): string {
  return `${MACHINE_OPERATOR_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function claimOperator(existingToken?: string): OperatorClaim {
  const store = getStore();
  const now = Date.now();
  const currentLease = store.operatorLease;

  if (!currentLease || isExpired(currentLease, now)) {
    const token = existingToken || createToken();
    store.operatorLease = createLease(token, now);
    return {
      isOperator: true,
      operatorToken: token,
      expiresAt: new Date(store.operatorLease.expiresAt).toISOString(),
    };
  }

  if (existingToken && existingToken === currentLease.token) {
    store.operatorLease = createLease(existingToken, now, currentLease.acquiredAt);
    return {
      isOperator: true,
      operatorToken: existingToken,
      expiresAt: new Date(store.operatorLease.expiresAt).toISOString(),
    };
  }

  return {
    isOperator: false,
    expiresAt: new Date(currentLease.expiresAt).toISOString(),
    message: "Outra aba já está com o controle da execução.",
  };
}

export function refreshOperatorLease(existingToken?: string): OperatorClaim {
  const store = getStore();
  const now = Date.now();
  const currentLease = store.operatorLease;

  if (!existingToken) {
    return {
      isOperator: false,
      message: "Esta aba não possui o controle da execução.",
    };
  }

  if (!currentLease || isExpired(currentLease, now)) {
    store.operatorLease = createLease(existingToken, now);
    return {
      isOperator: true,
      operatorToken: existingToken,
      expiresAt: new Date(store.operatorLease.expiresAt).toISOString(),
    };
  }

  if (existingToken !== currentLease.token) {
    return {
      isOperator: false,
      expiresAt: new Date(currentLease.expiresAt).toISOString(),
      message: "Outra aba já está com o controle da execução.",
    };
  }

  store.operatorLease = createLease(existingToken, now, currentLease.acquiredAt);
  return {
    isOperator: true,
    operatorToken: existingToken,
    expiresAt: new Date(store.operatorLease.expiresAt).toISOString(),
  };
}

export function getOperatorSnapshot(existingToken?: string): OperatorClaim {
  const store = getStore();
  const lease = store.operatorLease;
  const now = Date.now();

  if (!lease || isExpired(lease, now)) {
    if (lease) {
      store.operatorLease = null;
    }
    return {
      isOperator: false,
      message: "Nenhuma aba assumiu o controle da execução.",
    };
  }

  return {
    isOperator: existingToken === lease.token,
    operatorToken: existingToken === lease.token ? lease.token : undefined,
    expiresAt: new Date(lease.expiresAt).toISOString(),
    message:
      existingToken === lease.token
        ? undefined
        : "Outra aba já está com o controle da execução.",
  };
}

export function releaseOperator(existingToken?: string): boolean {
  const store = getStore();
  if (!existingToken || store.operatorLease?.token !== existingToken) {
    return false;
  }

  store.operatorLease = null;
  return true;
}

export function setActiveMachineSession(session: SolveSession): SolveSession {
  const store = getStore();
  store.activeSession = cloneSession(session);
  return cloneSession(store.activeSession);
}

export function getActiveMachineSession(jobId?: string): SolveSession | null {
  const session = getStore().activeSession;
  if (!session) {
    return null;
  }
  if (jobId && session.jobId !== jobId) {
    return null;
  }

  return cloneSession(session);
}

export function enrichMachineStatus(
  status: MachineStatusResponse,
): MachineStatusResponse {
  const session = getStore().activeSession;
  if (!session || session.jobId !== status.jobId) {
    return status;
  }

  const progress = resolveProgress(status, session);
  const currentCubeState =
    typeof progress.currentLogicalMoveIndex === "number"
      ? getCubeStateAtMoveIndex(
          session.initialCubeState,
          session.logicalMoves,
          progress.currentLogicalMoveIndex,
        )
      : status.currentCubeState;

  const enriched: MachineStatusResponse = {
    ...status,
    progress,
    currentCubeState,
  };

  getStore().activeSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    machineExecution: {
      status: enriched.status,
      updatedAt: enriched.updatedAt,
      errorMessage: enriched.errorMessage,
      progress: enriched.progress,
    },
  };

  return enriched;
}

export function queueDeviceJob(
  request: MachineStartRequest,
): MachineStatusResponse {
  const store = getStore();
  const existingActiveJob = [...store.deviceJobs.values()].find(
    (job) => job.status === "queued" || job.status === "started",
  );

  if (existingActiveJob && existingActiveJob.jobId !== request.jobId) {
    throw new Error(
      `Máquina ocupada com o job ${existingActiveJob.jobId}. Aguarde finalizar antes de iniciar outro.`,
    );
  }

  const existing = store.deviceJobs.get(request.jobId);
  if (existing) {
    return toMachineStatusResponse(existing);
  }

  const now = new Date().toISOString();
  const job: QueuedDeviceJob = {
    jobId: request.jobId,
    notation: request.notation ?? request.logicalMoves?.join(" ") ?? "",
    actions: [...request.actions],
    status: "queued",
    progress: {
      currentActionIndex: 0,
      completedActions: 0,
      totalActions: request.actions.length,
      currentActionType: request.actions[0]?.type,
    },
    createdAt: now,
    updatedAt: now,
  };

  store.deviceJobs.set(job.jobId, job);
  return toMachineStatusResponse(job);
}

export function getQueuedDeviceJobStatus(jobId: string): MachineStatusResponse {
  const job = getStore().deviceJobs.get(jobId);
  if (!job) {
    return {
      jobId,
      status: "error",
      updatedAt: new Date().toISOString(),
      errorMessage: "Job não encontrado na fila do backend.",
    };
  }

  return toMachineStatusResponse(job);
}

export function claimNextDeviceJob(deviceId: string): DeviceJobResponse {
  const store = getStore();
  const now = new Date().toISOString();
  const job = [...store.deviceJobs.values()].find(
    (candidate) => candidate.status === "queued",
  );

  if (!job) {
    return { hasJob: false };
  }

  const updated: QueuedDeviceJob = {
    ...job,
    status: "started",
    deviceId,
    claimedAt: now,
    updatedAt: now,
    progress: {
      ...job.progress,
      currentActionIndex: 0,
      completedActions: 0,
      currentActionType: job.actions[0]?.type,
    },
  };

  store.deviceJobs.set(updated.jobId, updated);
  enrichMachineStatus(toMachineStatusResponse(updated));

  return {
    hasJob: true,
    job: {
      jobId: updated.jobId,
      notation: updated.notation,
      actions: [...updated.actions],
    },
  };
}

export function updateDeviceJobStatus(
  update: DeviceStatusUpdateRequest,
): MachineStatusResponse {
  const store = getStore();
  const job = store.deviceJobs.get(update.jobId);
  if (!job) {
    throw new Error(`Job ${update.jobId} não encontrado no backend.`);
  }

  const now = new Date().toISOString();
  const progress = normalizeProgress(
    update.progress ?? job.progress,
    job.actions,
    update.status,
  );
  const updated: QueuedDeviceJob = {
    ...job,
    status: update.status,
    errorMessage: update.errorMessage,
    deviceId: update.deviceId ?? job.deviceId,
    progress,
    updatedAt: now,
  };

  store.deviceJobs.set(updated.jobId, updated);
  return enrichMachineStatus(toMachineStatusResponse(updated));
}

export function registerDevice(input: {
  ip: string;
  deviceId?: string;
}): RegisteredDevice {
  const now = new Date().toISOString();
  const device: RegisteredDevice = {
    deviceId: input.deviceId?.trim() || "rubik-solver-01",
    ip: input.ip.trim(),
    baseUrl: normalizeBaseUrl(input.ip),
    lastSeenAt: now,
  };

  getStore().registeredDevice = device;
  return { ...device };
}

export function getRegisteredDevice(): RegisteredDevice | null {
  const device = getStore().registeredDevice;
  return device ? { ...device } : null;
}

export function getDeviceBaseUrl(): string | null {
  const configuredBaseUrl = process.env.DEVICE_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const configuredIp = process.env.DEVICE_IP_OVERRIDE?.trim();
  if (configuredIp) {
    return normalizeBaseUrl(configuredIp);
  }

  return getStore().registeredDevice?.baseUrl ?? null;
}

export function getMachineDeviceInfo(): MachineDeviceInfo {
  const configuredBaseUrl = getDeviceBaseUrl();
  const registeredDevice = getRegisteredDevice();
  const gatewayMode = process.env.MACHINE_GATEWAY?.trim().toLowerCase();
  const isDirectMode = gatewayMode === "direct" || gatewayMode === "esp32";

  return {
    connected: Boolean(registeredDevice || (isDirectMode && configuredBaseUrl)),
    deviceId: registeredDevice?.deviceId,
    ip: registeredDevice?.ip ?? (isDirectMode ? process.env.DEVICE_IP_OVERRIDE : undefined),
    baseUrl: isDirectMode ? (configuredBaseUrl ?? undefined) : undefined,
    lastSeenAt: registeredDevice?.lastSeenAt,
  };
}

export function resetMachineStoreForTests(): void {
  globalStore.__rubiksMachineStore = {
    activeSession: null,
    operatorLease: null,
    registeredDevice: null,
    deviceJobs: new Map(),
  };
}

function toMachineStatusResponse(job: QueuedDeviceJob): MachineStatusResponse {
  return {
    jobId: job.jobId,
    status: job.status,
    updatedAt: job.updatedAt,
    errorMessage: job.errorMessage,
    progress: job.progress,
  };
}

function normalizeProgress(
  progress: MachineProgress,
  actions: readonly MechanicalAction[],
  status: MachineStatusResponse["status"],
): MachineProgress {
  const totalActions = actions.length;
  const completedActions = clampInteger(
    status === "finished"
      ? totalActions
      : progress.completedActions,
    0,
    totalActions,
  );
  const currentActionIndex = clampInteger(
    progress.currentActionIndex ??
      (completedActions >= totalActions
        ? Math.max(totalActions - 1, 0)
        : completedActions),
    0,
    Math.max(totalActions - 1, 0),
  );

  return {
    ...progress,
    currentActionIndex,
    completedActions,
    totalActions,
    currentActionType:
      progress.currentActionType ?? actions[currentActionIndex]?.type,
  };
}

function resolveProgress(
  status: MachineStatusResponse,
  session: SolveSession,
): MachineProgress {
  const totalActions = session.mechanicalPlan.actions.length;
  const reported = status.progress;
  const completedActions = clampInteger(
    reported?.completedActions ??
      (status.status === "finished" ? totalActions : 0),
    0,
    totalActions,
  );
  const currentActionIndex = clampInteger(
    reported?.currentActionIndex ??
      (completedActions >= totalActions
        ? Math.max(totalActions - 1, 0)
        : completedActions),
    0,
    Math.max(totalActions - 1, 0),
  );
  const currentLogicalMoveIndex = Math.min(
    countCompletedLogicalMoves(session.mechanicalPlan.actions, completedActions),
    session.logicalMoves.length,
  );

  return {
    ...reported,
    currentActionIndex,
    completedActions,
    totalActions,
    currentActionType:
      reported?.currentActionType ??
      session.mechanicalPlan.actions[currentActionIndex]?.type,
    currentLogicalMoveIndex,
    totalLogicalMoves: session.logicalMoves.length,
  };
}

function countCompletedLogicalMoves(
  actions: readonly MechanicalAction[],
  completedActions: number,
): number {
  return actions
    .slice(0, completedActions)
    .filter((action) => action.type === "turn_face").length;
}

function cloneSession(session: SolveSession): SolveSession {
  return JSON.parse(JSON.stringify(session)) as SolveSession;
}

function createLease(
  token: string,
  now: number,
  acquiredAt = now,
): OperatorLease {
  return {
    token,
    acquiredAt,
    refreshedAt: now,
    expiresAt: now + getOperatorLeaseMs(),
  };
}

function getOperatorLeaseMs(): number {
  const leaseSeconds = Number(process.env.MACHINE_OPERATOR_LEASE_SECONDS);
  if (Number.isFinite(leaseSeconds) && leaseSeconds > 0) {
    return leaseSeconds * 1000;
  }

  return DEFAULT_OPERATOR_LEASE_MS;
}

function getOperatorLeaseSeconds(): number {
  return Math.floor(getOperatorLeaseMs() / 1000);
}

function isExpired(lease: OperatorLease, now: number): boolean {
  return lease.expiresAt <= now;
}

function createToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCookieValue(
  cookieHeader: string | null,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== cookieName) {
      continue;
    }

    return decodeURIComponent(rawValue.join("="));
  }

  return undefined;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.floor(value), min), max);
}
