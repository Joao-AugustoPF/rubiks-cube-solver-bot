"use client";

import { useEffect, useMemo, useState } from "react";
import type { CubeState, LogicalMove, SolveSession } from "@/types";
import {
  getCubeStateAtMoveIndex,
  getCurrentMove,
  getSolveProgress,
} from "@/lib/solve-session";

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

interface UseSolveAnimationOptions {
  controlledMoveIndex?: number;
}

export function useSolveAnimation(
  session: SolveSession,
  options: UseSolveAnimationOptions = {},
): SolveAnimationController {
  const totalMoves = session.logicalMoves.length;
  const controlledMoveIndex = options.controlledMoveIndex;
  const hasControlledMoveIndex = typeof controlledMoveIndex === "number";
  const [moveIndex, setMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(session.animation.autoPlay);
  const [speedMs, setSpeedMs] = useState(session.animation.stepIntervalMs);

  useEffect(() => {
    setMoveIndex(0);
    setIsPlaying(session.animation.autoPlay);
    setSpeedMs(session.animation.stepIntervalMs);
  }, [
    session.jobId,
    session.initialCubeState,
    session.logicalMoves,
    session.animation.autoPlay,
    session.animation.stepIntervalMs,
  ]);

  useEffect(() => {
    if (!hasControlledMoveIndex) {
      return;
    }

    setIsPlaying(false);
    setMoveIndex(Math.min(Math.max(Math.floor(controlledMoveIndex), 0), totalMoves));
  }, [controlledMoveIndex, hasControlledMoveIndex, totalMoves]);

  useEffect(() => {
    if (hasControlledMoveIndex || !isPlaying || moveIndex >= totalMoves) {
      if (moveIndex >= totalMoves) {
        setIsPlaying(false);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setMoveIndex((currentIndex) => {
        return Math.min(currentIndex + 1, totalMoves);
      });
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [hasControlledMoveIndex, isPlaying, moveIndex, totalMoves, speedMs]);

  const cubeState = useMemo(
    () =>
      getCubeStateAtMoveIndex(
        session.initialCubeState,
        session.logicalMoves,
        moveIndex,
      ),
    [session.initialCubeState, session.logicalMoves, moveIndex],
  );

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
      if (hasControlledMoveIndex) {
        return;
      }
      if (moveIndex >= totalMoves) {
        return;
      }
      setIsPlaying(true);
    },
    pause: () => setIsPlaying(false),
    reset: () => {
      if (hasControlledMoveIndex) {
        return;
      }
      setIsPlaying(false);
      setMoveIndex(0);
    },
    setSpeedMs: (nextSpeedMs: number) => setSpeedMs(nextSpeedMs),
  };
}
