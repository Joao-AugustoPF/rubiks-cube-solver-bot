"use client";

import { useEffect, useMemo, useState } from "react";
import type { CubeState, LogicalMove, SolveSession } from "@/types";
import { applyMove, cloneCubeState } from "@/lib/cube";
import { getCurrentMove, getSolveProgress } from "@/lib/solve-session";

interface SolveAnimationController {
  cubeState: CubeState;
  isPlaying: boolean;
  moveIndex: number;
  totalMoves: number;
  currentMove: LogicalMove | null;
  progress: number;
  speedMs: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeedMs: (speedMs: number) => void;
}

export function useSolveAnimation(session: SolveSession): SolveAnimationController {
  const totalMoves = session.logicalMoves.length;
  const [cubeState, setCubeState] = useState<CubeState>(() =>
    cloneCubeState(session.initialCubeState),
  );
  const [moveIndex, setMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(session.animation.autoPlay);
  const [speedMs, setSpeedMs] = useState(session.animation.stepIntervalMs);

  useEffect(() => {
    setCubeState(cloneCubeState(session.initialCubeState));
    setMoveIndex(0);
    setIsPlaying(session.animation.autoPlay);
    setSpeedMs(session.animation.stepIntervalMs);
  }, [session]);

  useEffect(() => {
    if (!isPlaying || moveIndex >= totalMoves) {
      if (moveIndex >= totalMoves) {
        setIsPlaying(false);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setMoveIndex((currentIndex) => {
        if (currentIndex >= totalMoves) {
          return currentIndex;
        }

        setCubeState((currentState) =>
          applyMove(currentState, session.logicalMoves[currentIndex]),
        );
        return currentIndex + 1;
      });
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [isPlaying, moveIndex, totalMoves, speedMs, session.logicalMoves]);

  const currentMove = useMemo(
    () => getCurrentMove(session.logicalMoves, moveIndex),
    [session.logicalMoves, moveIndex],
  );
  const progress = useMemo(
    () => getSolveProgress(session.logicalMoves, moveIndex),
    [session.logicalMoves, moveIndex],
  );

  return {
    cubeState,
    isPlaying,
    moveIndex,
    totalMoves,
    currentMove,
    progress,
    speedMs,
    play: () => {
      if (moveIndex >= totalMoves) {
        return;
      }
      setIsPlaying(true);
    },
    pause: () => setIsPlaying(false),
    reset: () => {
      setIsPlaying(false);
      setMoveIndex(0);
      setCubeState(cloneCubeState(session.initialCubeState));
    },
    setSpeedMs: (nextSpeedMs: number) => setSpeedMs(nextSpeedMs),
  };
}
