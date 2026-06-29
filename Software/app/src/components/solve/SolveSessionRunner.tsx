"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  MachineControlSessionResponse,
  MachineStartRequest,
  MachineStatus,
  MachineStatusResponse,
  SolveSession,
} from "@/types";
import {
  loadSolveSession,
  saveSolveSession,
  updateSolveSessionMachineExecution,
} from "@/lib/solve-session";
import { SolveAnimationPlayer } from "./SolveAnimationPlayer";
import styles from "./SolveSessionRunner.module.css";

const POLL_INTERVAL_MS = 750;

export function SolveSessionRunner() {
  const [session, setSession] = useState<SolveSession | null>(null);
  const [controlSession, setControlSession] =
    useState<MachineControlSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [machineStatus, setMachineStatus] = useState<MachineStatus | null>(null);
  const [machineMoveIndex, setMachineMoveIndex] = useState<number | null>(null);
  const [machineError, setMachineError] = useState<string | null>(null);
  const [isStartingMachine, setIsStartingMachine] = useState(false);
  const [isPollingMachine, setIsPollingMachine] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const localSession = loadSolveSession();

      try {
        const response = await fetch("/api/machine/session", {
          method: "POST",
        });
        const body = (await response.json()) as
          | MachineControlSessionResponse
          | { message?: string };

        if (!response.ok || !("isOperator" in body)) {
          throw new Error(
            ("message" in body && body.message) ||
              "Falha ao consultar sessão da máquina.",
          );
        }
        if (cancelled) {
          return;
        }

        setControlSession(body);
        const selectedSession = selectDisplayedSession(
          localSession,
          body.activeSession ?? null,
        );
        applyLoadedSession(selectedSession);
        if (selectedSession && selectedSession.jobId === body.activeSession?.jobId) {
          saveSolveSession(selectedSession);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        applyLoadedSession(localSession);
        setMachineError(
          error instanceof Error
            ? error.message
            : "Erro ao consultar sessão da máquina.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.jobId) {
      setIsPollingMachine(false);
      return;
    }
    if (!machineStatus || machineStatus === "finished" || machineStatus === "error") {
      setIsPollingMachine(false);
      return;
    }

    setIsPollingMachine(true);
    let cancelled = false;
    const timer = window.setInterval(() => {
      void fetch(`/api/machine/status?jobId=${encodeURIComponent(session.jobId)}`)
        .then(async (response) => {
          const body = (await response.json()) as
            | MachineStatusResponse
            | { message?: string };
          if (!response.ok || !("status" in body)) {
            throw new Error(extractApiError(body, "Falha ao consultar status da máquina."));
          }
          if (cancelled) {
            return;
          }
          applyMachineStatus(body);
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          setMachineStatus("error");
          setMachineError(
            error instanceof Error
              ? error.message
              : "Erro ao consultar status da máquina.",
          );
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      setIsPollingMachine(false);
      window.clearInterval(timer);
    };
  }, [machineStatus, session?.jobId]);

  const statusLabel = useMemo(() => {
    if (!machineStatus) {
      return "Aguardando início";
    }
    if (machineStatus === "queued") {
      return "Na fila";
    }
    if (machineStatus === "started") {
      return "Executando";
    }
    if (machineStatus === "finished") {
      return "Finalizado";
    }
    return "Erro";
  }, [machineStatus]);

  const progress = session?.machineExecution?.progress;
  const operatorLabel = controlSession?.isOperator ? "Operador" : "Visualização";
  const connectionLabel = getConnectionLabel(controlSession);

  const canStartExecution =
    Boolean(controlSession?.isOperator) &&
    !isStartingMachine &&
    (machineStatus === null || isTerminalMachineStatus(machineStatus));

  const startButtonLabel = getStartButtonLabel({
    isOperator: Boolean(controlSession?.isOperator),
    isStartingMachine,
    machineStatus,
  });

  if (isLoading) {
    return (
      <section className={styles.block}>
        <p>Carregando sessão de execução...</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className={styles.block}>
        <h2>Comece pela etapa 1</h2>
        <p>
          Esta tela mostra a sessão criada no scanner/editor ou uma execução
          ativa já registrada no backend.
        </p>
        <div className={styles.emptyActions}>
          <Link href="/scan" className={styles.linkButton}>
            Usar scanner
          </Link>
          <Link href="/manual" className={styles.linkButton}>
            Montar manualmente
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.console} aria-label="Console da execução">
      <aside className={styles.machinePanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Máquina</span>
          <span
            className={`${styles.badge} ${
              machineStatus ? styles[`badge_${machineStatus}`] : styles.badge_neutral
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <h2>Sessão ativa</h2>
        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span>jobId</span>
            <code>{session.jobId}</code>
          </article>
          <article className={styles.metricCard}>
            <span>Movimentos lógicos</span>
            <code>{session.logicalMoves.length}</code>
          </article>
          <article className={styles.metricCard}>
            <span>Ações mecânicas</span>
            <code>{session.mechanicalPlan.actions.length}</code>
          </article>
        </div>

        <dl className={styles.runtimeList}>
          <div>
            <dt>Permissão</dt>
            <dd>{operatorLabel}</dd>
          </div>
          <div>
            <dt>Conexão</dt>
            <dd>{connectionLabel}</dd>
          </div>
          <div>
            <dt>Consulta de status</dt>
            <dd>{isPollingMachine ? "ativa" : "inativa"}</dd>
          </div>
          <div>
            <dt>Progresso físico</dt>
            <dd>
              {progress
                ? `${progress.completedActions}/${progress.totalActions}`
                : "sem telemetria"}
            </dd>
          </div>
        </dl>

        <div className={styles.machineActions}>
          <button
            type="button"
            onClick={() => void handleStartMachine()}
            disabled={!canStartExecution}
            className={styles.primaryButton}
          >
            {startButtonLabel}
          </button>
        </div>
        {machineError ? <p className={styles.error}>{machineError}</p> : null}
        {controlSession?.message && !controlSession.isOperator ? (
          <p className={styles.note}>{controlSession.message}</p>
        ) : null}
        {machineStatus === "finished" ? (
          <p className={styles.success}>
            Execução finalizada. O cubo exibido acompanha o último progresso da máquina.
          </p>
        ) : null}
        <p className={styles.note}>
          O operador envia o plano mecânico para o backend. Outras abas acompanham
          a mesma sessão sem poder iniciar comandos.
        </p>
      </aside>

      <div className={styles.stagePanel}>
        <SolveAnimationPlayer
          session={session}
          machineStatus={machineStatus}
          machineMoveIndex={machineMoveIndex}
        />
      </div>
    </section>
  );

  function applyLoadedSession(loaded: SolveSession | null) {
    setSession(loaded);
    setMachineStatus(loaded?.machineExecution?.status ?? null);
    setMachineMoveIndex(null);
    setMachineError(loaded?.machineExecution?.errorMessage ?? null);
  }

  async function handleStartMachine() {
    if (!session) {
      return;
    }

    setIsStartingMachine(true);
    setMachineError(null);

    const sessionForExecution = createSessionForMachineStart(
      session,
      isTerminalMachineStatus(machineStatus),
    );

    const payload: MachineStartRequest = {
      jobId: sessionForExecution.jobId,
      notation: sessionForExecution.logicalMoves.join(" "),
      actions: sessionForExecution.mechanicalPlan.actions,
      initialCubeState: sessionForExecution.initialCubeState,
      logicalMoves: sessionForExecution.logicalMoves,
    };

    try {
      const response = await fetch("/api/machine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | MachineStatusResponse
        | { message?: string };
      if (!response.ok || !("status" in body)) {
        throw new Error(extractApiError(body, "Falha ao iniciar máquina."));
      }
      applyMachineStatus(body, sessionForExecution);
    } catch (error: unknown) {
      setMachineStatus("error");
      setMachineError(error instanceof Error ? error.message : "Erro ao iniciar máquina.");
    } finally {
      setIsStartingMachine(false);
    }
  }

  function applyMachineStatus(
    statusResponse: MachineStatusResponse,
    baseSession?: SolveSession,
  ) {
    setMachineStatus(statusResponse.status);
    setMachineMoveIndex(null);
    setMachineError(statusResponse.errorMessage ?? null);

    setSession((previous) => {
      const sessionToUpdate = baseSession ?? previous;
      if (!sessionToUpdate) {
        return previous;
      }

      const updated: SolveSession = {
        ...sessionToUpdate,
        jobId: statusResponse.jobId,
        updatedAt: new Date().toISOString(),
        mechanicalPlan: {
          ...sessionToUpdate.mechanicalPlan,
          jobId: statusResponse.jobId,
        },
        machineExecution: {
          status: statusResponse.status,
          updatedAt: statusResponse.updatedAt,
          errorMessage: statusResponse.errorMessage,
          progress: statusResponse.progress,
        },
      };
      saveSolveSession(updated);
      return updated;
    });
    updateSolveSessionMachineExecution({
      jobId: statusResponse.jobId,
      status: statusResponse.status,
      updatedAt: statusResponse.updatedAt,
      errorMessage: statusResponse.errorMessage,
      progress: statusResponse.progress,
    });
  }
}

function extractApiError(
  body: MachineStatusResponse | { message?: string },
  fallback: string,
): string {
  if ("errorMessage" in body && body.errorMessage) {
    return body.errorMessage;
  }
  if ("message" in body && body.message) {
    return body.message;
  }

  return fallback;
}

function getStartButtonLabel(input: {
  isOperator: boolean;
  isStartingMachine: boolean;
  machineStatus: MachineStatus | null;
}): string {
  if (!input.isOperator) {
    return "Visualização apenas";
  }
  if (input.isStartingMachine) {
    return "Iniciando...";
  }
  if (input.machineStatus === null) {
    return "Iniciar execução";
  }
  if (input.machineStatus === "finished") {
    return "Enviar novamente";
  }
  if (input.machineStatus === "error") {
    return "Tentar novamente";
  }

  return "Execução em andamento";
}

function selectDisplayedSession(
  localSession: SolveSession | null,
  activeSession: SolveSession | null,
): SolveSession | null {
  if (!activeSession) {
    return localSession;
  }
  if (!localSession) {
    return activeSession;
  }

  const activeStatus = activeSession.machineExecution?.status ?? null;
  if (activeStatus === "queued" || activeStatus === "started") {
    return activeSession;
  }

  if (activeSession.jobId === localSession.jobId) {
    return activeSession;
  }

  return getTimestamp(localSession.updatedAt) > getTimestamp(activeSession.updatedAt)
    ? localSession
    : activeSession;
}

function createSessionForMachineStart(
  session: SolveSession,
  forceNewJob: boolean,
): SolveSession {
  if (!forceNewJob) {
    return session;
  }

  const jobId = createRetryJobId(session.jobId);
  return {
    ...session,
    jobId,
    updatedAt: new Date().toISOString(),
    mechanicalPlan: {
      ...session.mechanicalPlan,
      jobId,
    },
    machineExecution: undefined,
  };
}

function createRetryJobId(jobId: string): string {
  const baseJobId = jobId.replace(/-run-[a-z0-9]+-[a-z0-9]+$/i, "");
  const random = Math.random().toString(36).slice(2, 7);
  return `${baseJobId}-run-${Date.now().toString(36)}-${random}`;
}

function isTerminalMachineStatus(status: MachineStatus | null): boolean {
  return status === "finished" || status === "error";
}

function getTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getConnectionLabel(
  controlSession: MachineControlSessionResponse | null,
): string {
  if (!controlSession) {
    return "desconhecida";
  }
  if (controlSession.gatewayMode === "mock") {
    return "Mock local";
  }
  if (controlSession.gatewayMode === "direct") {
    return controlSession.device?.connected
      ? "ESP32 direto"
      : "ESP32 direto pendente";
  }

  return controlSession.device?.connected
    ? "ESP32 via polling"
    : "Aguardando ESP32";
}
