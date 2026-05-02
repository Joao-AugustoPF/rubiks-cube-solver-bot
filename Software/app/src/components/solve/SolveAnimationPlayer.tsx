"use client";

import { useEffect, useRef } from "react";
import type { SolveSession } from "@/types";
import { isSolvedCube } from "@/lib/cube";
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
  const active3DMove =
    moveIndex < totalMoves ? (session.logicalMoves[moveIndex] ?? null) : null;
  const hasMachineStarted =
    machineStatus === "started" || machineStatus === "finished";
  const waitingMachineStart = !hasMachineStarted && totalMoves > 0;

  return (
    <section className={styles.player}>
      <div className={styles.statusBlock}>
        <h2>Execução da solução</h2>
        <p>
          <strong>jobId:</strong> {session.jobId}
        </p>
        <p>
          <strong>Movimento atual:</strong> {currentMove ?? "Aguardando início"}
        </p>
        <p>
          <strong>Status de disparo:</strong>{" "}
          {hasMachineStarted ? (
            <span className={styles.ready}>liberado (máquina iniciada)</span>
          ) : (
            <span className={styles.waiting}>bloqueado até o status `started`</span>
          )}
        </p>
        <p>
          <strong>Progresso:</strong> {moveIndex}/{totalMoves} (
          {Math.round(progress * 100)}%)
        </p>
        <div className={styles.progressBar}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={play}
          disabled={!hasMachineStarted || isPlaying || isFinished}
        >
          Reproduzir
        </button>
        <button type="button" onClick={pause} disabled={!hasMachineStarted || !isPlaying}>
          Pausar
        </button>
        <button type="button" onClick={reset} disabled={!hasMachineStarted}>
          Reiniciar
        </button>
        <label className={styles.speedControl}>
          Velocidade: {speedMs}ms
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

      <Cube3DAnimator
        cubeState={cubeState}
        activeMove={active3DMove}
        isPlaying={isPlaying}
        moveIndex={moveIndex}
        progress={progress}
        speedMs={speedMs}
        totalMoves={totalMoves}
      />

      <div className={styles.viewerGrid}>
        <CubeNetViewer
          cubeState={session.initialCubeState}
          title="Estado inicial"
          subtitle="Estado recebido da solução."
        />
        <CubeNetViewer
          cubeState={cubeState}
          title="Estado atual"
          subtitle="Atualizado a cada `logicalMove`."
        />
      </div>

      <div className={styles.sequence}>
        <h3>Sequência de movimentos</h3>
        {session.logicalMoves.length === 0 ? (
          <p>Cubo já está resolvido. Não há movimentos para executar.</p>
        ) : (
          <div className={styles.moveList}>
            {session.logicalMoves.map((move, index) => {
              const isApplied = index < moveIndex;
              const isCurrent = index === moveIndex;
              return (
                <span
                  key={`${move}-${index}`}
                  className={`${styles.moveChip} ${
                    isApplied ? styles.appliedMove : ""
                  } ${isCurrent ? styles.currentMove : ""}`}
                >
                  {move}
                </span>
              );
            })}
          </div>
        )}
      </div>

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
