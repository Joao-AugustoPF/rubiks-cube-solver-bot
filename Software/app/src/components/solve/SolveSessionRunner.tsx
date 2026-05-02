"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MachineStartRequest, MachineStatus, MachineStatusResponse, SolveSession } from "@/types";
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
  const [isLoading, setIsLoading] = useState(true);
  const [machineStatus, setMachineStatus] = useState<MachineStatus | null>(null);
  const [machineError, setMachineError] = useState<string | null>(null);
  const [isStartingMachine, setIsStartingMachine] = useState(false);
  const [isPollingMachine, setIsPollingMachine] = useState(false);

  useEffect(() => {
    const loaded = loadSolveSession();
    setSession(loaded);
    setMachineStatus(loaded?.machineExecution?.status ?? null);
    setMachineError(loaded?.machineExecution?.errorMessage ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
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
          const body = (await response.json()) as MachineStatusResponse | { message?: string };
          if (!response.ok || !("status" in body)) {
            throw new Error(("message" in body && body.message) || "Falha ao consultar status da máquina.");
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
          setMachineError(error instanceof Error ? error.message : "Erro ao consultar status da máquina.");
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      setIsPollingMachine(false);
      window.clearInterval(timer);
    };
  }, [machineStatus, session]);

  const statusLabel = useMemo(() => {
    if (!machineStatus) {
      return "Aguardando início manual";
    }
    if (machineStatus === "queued") {
      return "queued";
    }
    if (machineStatus === "started") {
      return "started";
    }
    if (machineStatus === "finished") {
      return "finished";
    }
    return "error";
  }, [machineStatus]);

  const canStartExecution =
    !isStartingMachine && (machineStatus === null || machineStatus === "error");

  const startButtonLabel = isStartingMachine
    ? "Iniciando mock..."
    : machineStatus === null
      ? "Iniciar execução"
      : "Tentar iniciar novamente";

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
          Esta tela só mostra a animação depois que uma sessão é criada no
          scanner ou no editor manual.
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
          <span className={styles.panelLabel}>Máquina mock</span>
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
            <dt>Consulta de status</dt>
            <dd>{isPollingMachine ? "ativa" : "inativa"}</dd>
          </div>
          <div>
            <dt>Disparo da animação</dt>
            <dd>
              {machineStatus === "started" || machineStatus === "finished"
                ? "liberado"
                : "aguardando start"}
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
        {machineStatus === "finished" ? (
          <p className={styles.success}>
            Execução mock finalizada. A animação deve estar completa.
          </p>
        ) : null}
        <p className={styles.note}>
          O botão envia o plano mecânico para o mock. Quando o status muda para{" "}
          <code>started</code>, o palco 3D começa automaticamente.
        </p>
      </aside>

      <div className={styles.stagePanel}>
        <SolveAnimationPlayer session={session} machineStatus={machineStatus} />
      </div>
    </section>
  );

  async function handleStartMachine() {
    if (!session) {
      return;
    }

    setIsStartingMachine(true);
    setMachineError(null);

    const payload: MachineStartRequest = {
      jobId: session.jobId,
      actions: session.mechanicalPlan.actions,
    };

    try {
      const response = await fetch("/api/machine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as MachineStatusResponse | { message?: string };
      if (!response.ok || !("status" in body)) {
        throw new Error(("message" in body && body.message) || "Falha ao iniciar mock da máquina.");
      }
      applyMachineStatus(body);
    } catch (error: unknown) {
      setMachineStatus("error");
      setMachineError(error instanceof Error ? error.message : "Erro ao iniciar máquina.");
    } finally {
      setIsStartingMachine(false);
    }
  }

  function applyMachineStatus(statusResponse: MachineStatusResponse) {
    setMachineStatus(statusResponse.status);
    setMachineError(statusResponse.errorMessage ?? null);

    setSession((previous) => {
      if (!previous) {
        return previous;
      }

      const updated: SolveSession = {
        ...previous,
        updatedAt: new Date().toISOString(),
        machineExecution: {
          status: statusResponse.status,
          updatedAt: statusResponse.updatedAt,
          errorMessage: statusResponse.errorMessage,
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
    });
  }
}
