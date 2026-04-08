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
        <h2>Nenhuma sessão de solução disponível</h2>
        <p>
          Gere uma sessão de solve via scanner ou montagem manual para abrir a
          execução completa.
        </p>
        <div className={styles.emptyActions}>
          <Link href="/scan" className={styles.linkButton}>
            Abrir scanner
          </Link>
          <Link href="/manual" className={styles.linkButton}>
            Abrir montagem manual
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.stack}>
      <section className={styles.machineBlock}>
        <h2>Execução da Máquina Mock</h2>
        <p>
          <strong>jobId:</strong> {session.jobId}
        </p>
        <p>
          <strong>Movimentos lógicos:</strong> {session.logicalMoves.length}
        </p>
        <p>
          <strong>Ações mecânicas:</strong> {session.mechanicalPlan.actions.length}
        </p>
        <p>
          <strong>status:</strong>{" "}
          <span
            className={`${styles.badge} ${
              machineStatus ? styles[`badge_${machineStatus}`] : styles.badge_neutral
            }`}
          >
            {statusLabel}
          </span>
        </p>
        <p className={styles.pollingInfo}>
          Polling do status: {isPollingMachine ? "ativo" : "inativo"}
        </p>
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
          A animação inicia automaticamente somente quando o mock retornar{" "}
          <code>started</code>.
        </p>
      </section>

      <SolveAnimationPlayer session={session} machineStatus={machineStatus} />
    </div>
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
