"use client";

import { useEffect, useRef } from "react";
import type { SolveSession } from "@/types";
import { createSolvedCube, isSolvedCube } from "@/lib/cube";
import { useSolveAnimation } from "@/hooks/useSolveAnimation";
import { CubeNetViewer } from "@/components/cube/CubeNetViewer";
import { Cube3DAnimator } from "./Cube3DAnimator";
import styles from "./SolveAnimationPlayer.module.css";

interface SolveAnimationPlayerProps {
  session: SolveSession;
  machineStatus?: "queued" | "started" | "finished" | "error" | null;
}

export function SolveAnimationPlayer({
  session,
  machineStatus = null,
}: SolveAnimationPlayerProps) {
  const {
    cubeState,
    currentMove,
    isPlaying,
    moveIndex,
    progress,
    reset,
    pause,
    play,
    setSpeedMs,
    speedMs,
    totalMoves,
  } = useSolveAnimation(session);
  const startedTriggerRef = useRef(false);

  useEffect(() => {
    startedTriggerRef.current = false;
  }, [session.jobId]);

  useEffect(() => {
    if (machineStatus !== "started" && machineStatus !== "finished") {
      return;
    }
    if (startedTriggerRef.current) {
      return;
    }
    startedTriggerRef.current = true;
    play();
  }, [machineStatus, play]);

  const isFinished = moveIndex >= totalMoves;
  const isSolvedAtEnd = isFinished && isSolvedCube(cubeState);
  const endPreviewState = isFinished ? cubeState : createSolvedCube();
  const active3DMove =
    moveIndex < totalMoves ? (session.logicalMoves[moveIndex] ?? null) : null;
  const hasMachineStarted =
    machineStatus === "started" || machineStatus === "finished";
  const waitingMachineStart = !hasMachineStarted && totalMoves > 0;

  return (
    <section className={styles.player}>
      <div className={styles.commandBar}>
        <div className={styles.telemetryGrid}>
          <div>
            <span>Movimento</span>
            <strong>{currentMove ?? "Aguardando"}</strong>
          </div>
          <div>
            <span>Disparo</span>
            <strong className={hasMachineStarted ? styles.ready : styles.waiting}>
              {hasMachineStarted ? "liberado" : "bloqueado"}
            </strong>
          </div>
          <div>
            <span>Progresso</span>
            <strong>
              {moveIndex}/{totalMoves} · {Math.round(progress * 100)}%
            </strong>
          </div>
        </div>
        <div className={styles.progressBar}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={play}
            disabled={!hasMachineStarted || isPlaying || isFinished}
          >
            Reproduzir
          </button>
          <button
            type="button"
            onClick={pause}
            disabled={!hasMachineStarted || !isPlaying}
          >
            Pausar
          </button>
          <button type="button" onClick={reset} disabled={!hasMachineStarted}>
            Reiniciar
          </button>
          <label className={styles.speedControl}>
            <span>Velocidade {speedMs}ms</span>
            <input
              type="range"
              min={180}
              max={1600}
              step={20}
              value={speedMs}
              onChange={(event) => setSpeedMs(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <Cube3DAnimator
        cubeState={cubeState}
        activeMove={active3DMove}
        isPlaying={isPlaying}
        moveIndex={moveIndex}
        progress={progress}
        speedMs={speedMs}
        totalMoves={totalMoves}
      />

      <section className={styles.lowerPanel} aria-label="Resumo da execução">
        <div className={styles.sequence}>
          <div className={styles.sequenceHeader}>
            <div>
              <span>Sequência</span>
              <h3>Início → fim</h3>
            </div>
            <strong>
              {moveIndex}/{totalMoves}
            </strong>
          </div>
          {session.logicalMoves.length === 0 ? (
            <p>Cubo já está resolvido. Não há movimentos para executar.</p>
          ) : (
            <ol className={styles.moveList} aria-label="Fila de movimentos">
              {session.logicalMoves.map((move, index) => {
                const isApplied = index < moveIndex;
                const isCurrent = index === moveIndex;
                return (
                  <li
                    key={`${move}-${index}`}
                    className={`${styles.moveChip} ${
                      isApplied ? styles.appliedMove : ""
                    } ${isCurrent ? styles.currentMove : ""}`}
                  >
                    {move}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className={styles.stateComparison} aria-label="Comparação de estados">
          <CubeNetViewer
            cubeState={session.initialCubeState}
            title="Início"
            subtitle="Estado antes da execução."
          />
          <CubeNetViewer
            cubeState={endPreviewState}
            title={isFinished ? "Fim" : "Fim esperado"}
            subtitle={
              isFinished
                ? "Estado final da animação."
                : "Destino da solução."
            }
          />
        </div>
      </section>

      <div className={styles.result}>
        {waitingMachineStart ? (
          <p className={styles.waiting}>
            Aguardando a máquina mock iniciar para começar a animação.
          </p>
        ) : isFinished ? (
          isSolvedAtEnd ? (
            <p className={styles.success}>
              Animação concluída. Cubo resolvido com sucesso.
            </p>
          ) : (
            <p className={styles.error}>
              Animação concluída, mas o estado final não ficou resolvido.
            </p>
          )
        ) : (
          <p>Animação em andamento. Use os controles para pausar ou reiniciar.</p>
        )}
      </div>
    </section>
  );
}
