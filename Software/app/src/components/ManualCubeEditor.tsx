"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  COLOR_ORDER,
  FACE_ORDER,
  type Color,
  type CubeState,
  type Face,
  type LogicalMove,
  type SolveCubeApiResponse,
  type SolveSession,
} from "@/types";
import { applyMoves, createSolvedCube, generateRandomScramble } from "@/lib/cube";
import { createSolveSession, saveSolveSession } from "@/lib/solve-session";
import styles from "./ManualCubeEditor.module.css";

type EditableSticker = Color | null;
type EditableFace = [
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
  EditableSticker,
];
type EditableCubeState = Record<Face, EditableFace>;
type SolvePhase = "idle" | "validating" | "solving" | "saving" | "done" | "error";

const FACE_GRID_AREA: Record<Face, string> = {
  U: "u",
  L: "l",
  F: "f",
  R: "r",
  B: "b",
  D: "d",
};

const COLOR_HEX: Record<Color, string> = {
  white: "#f8fafc",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  blue: "#3b82f6",
};

const COLOR_LABEL: Record<Color, string> = {
  white: "Branco",
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  orange: "Laranja",
  blue: "Azul",
};

const COLOR_TEXT_CLASS: Record<Color, string> = {
  white: styles.darkText,
  yellow: styles.darkText,
  orange: styles.darkText,
  red: styles.lightText,
  green: styles.lightText,
  blue: styles.lightText,
};

const FACE_NAME: Record<Face, string> = {
  U: "Cima",
  R: "Direita",
  F: "Frente",
  D: "Baixo",
  L: "Esquerda",
  B: "Trás",
};

const SOLVE_TIMEOUT_MS = 20_000;

const SOLVE_PHASE_LABEL: Record<SolvePhase, string> = {
  idle: "Pronto para resolver",
  validating: "Validando cubo",
  solving: "Calculando solução",
  saving: "Salvando sessão",
  done: "Solução pronta",
  error: "Ajuste necessário",
};

const SOLVE_PHASE_PROGRESS: Record<SolvePhase, number> = {
  idle: 0,
  validating: 25,
  solving: 65,
  saving: 88,
  done: 100,
  error: 100,
};

const SOLVE_STEPS: Array<{ phase: SolvePhase; label: string }> = [
  { phase: "validating", label: "Validar" },
  { phase: "solving", label: "Resolver" },
  { phase: "saving", label: "Salvar" },
  { phase: "done", label: "Pronto" },
];

export function ManualCubeEditor() {
  const router = useRouter();
  const [cube, setCube] = useState<EditableCubeState>(() =>
    toEditableCube(createSolvedCube()),
  );
  const [activeColor, setActiveColor] = useState<Color>("white");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolveCubeApiResponse | null>(null);
  const [solveSession, setSolveSession] = useState<SolveSession | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solvePhase, setSolvePhase] = useState<SolvePhase>("idle");
  const [solveStartedAt, setSolveStartedAt] = useState<number | null>(null);
  const [solveElapsedMs, setSolveElapsedMs] = useState(0);
  const [lastScramble, setLastScramble] = useState<LogicalMove[]>([]);
  const [isRedirectingToExecution, setIsRedirectingToExecution] = useState(false);

  const colorCount = useMemo(() => countColors(cube), [cube]);
  const filledStickers = useMemo(() => countFilledStickers(cube), [cube]);
  const missingStickers = 54 - filledStickers;
  const hasBalancedColors = useMemo(
    () => COLOR_ORDER.every((color) => colorCount[color] === 9),
    [colorCount],
  );
  const canSolve = !isSolving && !isValidating && missingStickers === 0 && hasBalancedColors;
  const solveButtonLabel = getSolveButtonLabel({
    isSolving,
    missingStickers,
    hasBalancedColors,
  });

  useEffect(() => {
    if (!solveStartedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setSolveElapsedMs(Date.now() - solveStartedAt);
    }, 250);

    return () => window.clearInterval(timer);
  }, [solveStartedAt]);

  useEffect(() => {
    if (!isRedirectingToExecution || !solveSession) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.push("/solve");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isRedirectingToExecution, router, solveSession]);

  const handlePaintSticker = (face: Face, index: number) => {
    if (index === 4 || isSolving) {
      return;
    }

    setCube((current) => {
      const next = cloneEditableCube(current);
      next[face][index] = activeColor;
      return next;
    });
    clearGeneratedSolution();
  };

  const handleClearSticker = (face: Face, index: number) => {
    if (index === 4 || isSolving) {
      return;
    }

    setCube((current) => {
      const next = cloneEditableCube(current);
      next[face][index] = null;
      return next;
    });
    clearGeneratedSolution();
  };

  const handleResetSolved = () => {
    setCube(toEditableCube(createSolvedCube()));
    setLastScramble([]);
    setValidationErrors([]);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    resetSolveProgress();
  };

  const handleClearCube = () => {
    setCube(createEmptyEditableCubeState());
    setLastScramble([]);
    setValidationErrors([]);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    resetSolveProgress();
  };

  const handleRandomizeCube = () => {
    if (isSolving) {
      return;
    }

    const scramble = generateRandomScramble();
    const scrambledCube = applyMoves(createSolvedCube(), scramble);
    setCube(toEditableCube(scrambledCube));
    setLastScramble(scramble);
    setValidationErrors([]);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    resetSolveProgress();
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    resetSolveProgress();

    try {
      const response = await fetchWithTimeout("/api/cube/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cubeState: cube }),
      });

      const payload = (await response.json()) as {
        valid?: boolean;
        errors?: string[];
        message?: string;
      };

      if (!response.ok || !payload.valid) {
        setValidationErrors(
          payload.errors?.length
            ? payload.errors
            : [payload.message ?? "Falha na validação do cubo."],
        );
        return;
      }

      setValidationErrors([]);
    } catch {
      setRequestError(
        "Erro de comunicação ao validar cubo. Verifique a API e tente novamente.",
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSolve = async () => {
    if (!canSolve) {
      setSolvePhase("error");
      setValidationErrors(getReadinessErrors(missingStickers, hasBalancedColors));
      return;
    }

    setIsSolving(true);
    setRequestError(null);
    setValidationErrors([]);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    setSolvePhase("validating");
    setSolveStartedAt(Date.now());
    setSolveElapsedMs(0);

    try {
      const validationResponse = await fetchWithTimeout("/api/cube/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cubeState: cube }),
      });

      const validationPayload = (await validationResponse.json()) as {
        valid?: boolean;
        errors?: string[];
        message?: string;
      };

      if (!validationResponse.ok || !validationPayload.valid) {
        setSolvePhase("error");
        setValidationErrors(
          validationPayload.errors?.length
            ? validationPayload.errors
            : [validationPayload.message ?? "Falha na validação do cubo."],
        );
        return;
      }

      setSolvePhase("solving");
      const response = await fetchWithTimeout("/api/cube/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cubeState: cube }),
      });

      const payload = (await response.json()) as
        | SolveCubeApiResponse
        | {
            message?: string;
            errors?: string[];
          };

      if (!response.ok) {
        const maybeErrorPayload = payload as {
          message?: string;
          errors?: string[];
        };
        setSolvePhase("error");
        setValidationErrors(maybeErrorPayload.errors ?? []);
        setRequestError(
          maybeErrorPayload.message ??
            "Falha ao resolver cubo. Revise o estado informado.",
        );
        return;
      }

      setValidationErrors([]);
      setSolvePhase("saving");
      const solveResponse = payload as SolveCubeApiResponse;
      setSolution(solveResponse);
      const session = createSolveSession(solveResponse);
      saveSolveSession(session);
      setSolveSession(session);
      setSolvePhase("done");
      setIsRedirectingToExecution(true);
    } catch (error) {
      setSolvePhase("error");
      setRequestError(
        isAbortError(error)
          ? "O solver passou de 20s sem responder. Revise o cubo ou tente novamente."
          : "Erro de comunicação ao resolver cubo. Verifique a API e tente novamente.",
      );
    } finally {
      setIsSolving(false);
      setSolveStartedAt(null);
    }
  };

  function clearGeneratedSolution() {
    setLastScramble([]);
    setSolution(null);
    setSolveSession(null);
    setIsRedirectingToExecution(false);
    setRequestError(null);
    setValidationErrors([]);
    resetSolveProgress();
  }

  function resetSolveProgress() {
    setSolvePhase("idle");
    setSolveStartedAt(null);
    setSolveElapsedMs(0);
  }

  return (
    <section className={styles.editor}>
      <div className={styles.workspaceGrid}>
        <aside className={styles.controlRail}>
          <div className={styles.brushPanel}>
            <span className={styles.sectionTag}>pincel ativo</span>
            <div className={styles.activeBrush}>
              <span
                className={styles.activeBrushSwatch}
                style={{ backgroundColor: COLOR_HEX[activeColor] }}
              />
              <strong>{COLOR_LABEL[activeColor]}</strong>
            </div>
          </div>

          <div className={styles.palette} aria-label="Paleta de cores">
            {COLOR_ORDER.map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={activeColor === color}
                className={`${styles.colorButton} ${
                  activeColor === color ? styles.colorButtonActive : ""
                } ${COLOR_TEXT_CLASS[color]}`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                onClick={() => setActiveColor(color)}
                disabled={isSolving}
              >
                {COLOR_LABEL[color]}
              </button>
            ))}
          </div>

          <div className={styles.countPanel}>
            <div className={styles.compactMetrics}>
              <div>
                <span>Preenchidos</span>
                <strong>{filledStickers}/54</strong>
              </div>
              <div>
                <span>Faltam</span>
                <strong>{missingStickers}</strong>
              </div>
            </div>

            <ul className={styles.countList} aria-label="Contagem por cor">
              {COLOR_ORDER.map((color) => {
                const count = colorCount[color];
                const isComplete = count === 9;

                return (
                  <li
                    key={color}
                    className={isComplete ? styles.countComplete : styles.countPending}
                  >
                    <span
                      className={styles.colorBadge}
                      style={{ backgroundColor: COLOR_HEX[color] }}
                    />
                    <span>{COLOR_LABEL[color]}</span>
                    <strong>{count}/9</strong>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={handleRandomizeCube} disabled={isSolving}>
              Embaralhar
            </button>
            <button type="button" onClick={handleResetSolved} disabled={isSolving}>
              Estado resolvido
            </button>
            <button type="button" onClick={handleClearCube} disabled={isSolving}>
              Limpar peças
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || isSolving}
            >
              {isValidating ? "Validando..." : "Validar"}
            </button>
            <button
              type="button"
              onClick={handleSolve}
              disabled={!canSolve}
              className={styles.primaryAction}
            >
              {solveButtonLabel}
            </button>
          </div>

          {lastScramble.length > 0 ? (
            <div className={styles.scrambleBox}>
              <span className={styles.sectionTag}>scramble</span>
              <p>{lastScramble.join(" ")}</p>
            </div>
          ) : null}

          <div className={styles.solveStatus} role="status" aria-live="polite">
            <div className={styles.solveStatusHeader}>
              <strong>{SOLVE_PHASE_LABEL[solvePhase]}</strong>
              <span>{formatElapsed(solveElapsedMs)}</span>
            </div>
            <div className={styles.solveProgressTrack}>
              <div
                className={
                  solvePhase === "error"
                    ? styles.solveProgressError
                    : styles.solveProgressFill
                }
                style={{ width: `${SOLVE_PHASE_PROGRESS[solvePhase]}%` }}
              />
            </div>
            <ol className={styles.solveSteps}>
              {SOLVE_STEPS.map((step) => (
                <li
                  key={step.phase}
                  className={styles[getSolveStepClassName(solvePhase, step.phase)]}
                >
                  {step.label}
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.feedback}>
            <span className={styles.sectionTag}>retorno</span>
            {requestError ? (
              <p role="alert" className={styles.error}>
                {requestError}
              </p>
            ) : null}
            {validationErrors.length > 0 ? (
              <ul role="alert" className={styles.errorList}>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.success}>Sem erros de validação.</p>
            )}
          </div>
        </aside>

        <div className={styles.preview}>
          <span className={styles.sectionTag}>área de trabalho</span>
          <h3>Pré-visualização 2D do cubo (URFDLB)</h3>
          <p>
            Clique em qualquer peça com o pincel ativo. Os centros ficam travados
            para manter a orientação do cubo.
          </p>

          <div className={styles.net}>
            {FACE_ORDER.map((face) => (
              <div
                key={face}
                className={styles.faceCard}
                style={{ gridArea: FACE_GRID_AREA[face] }}
              >
                <header>
                  <strong>{face}</strong>
                  <span>{FACE_NAME[face]}</span>
                </header>

                <div className={styles.faceGrid}>
                  {cube[face].map((stickerColor, index) => (
                    <button
                      key={`${face}-${index}`}
                      type="button"
                      className={`${styles.sticker} ${
                        index === 4 ? styles.centerSticker : ""
                      } ${stickerColor ? "" : styles.emptySticker}`}
                      disabled={index === 4 || isSolving}
                      title={
                        index === 4
                          ? `Centro ${FACE_NAME[face]}`
                          : `Pintar com ${COLOR_LABEL[activeColor]}`
                      }
                      aria-label={`Face ${face}, posição ${index}, ${
                        stickerColor ? COLOR_LABEL[stickerColor] : "sem cor"
                      }`}
                      style={{
                        backgroundColor: stickerColor
                          ? COLOR_HEX[stickerColor]
                          : "transparent",
                      }}
                      onClick={() => handlePaintSticker(face, index)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        handleClearSticker(face, index);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.solution}>
          <span className={styles.sectionTag}>resultado</span>
          <h3>Solução lógica</h3>
          {isSolving ? (
            <div className={styles.pendingSolution}>
              <strong>{SOLVE_PHASE_LABEL[solvePhase]}</strong>
              <span>{formatElapsed(solveElapsedMs)}</span>
            </div>
          ) : solution ? (
            <>
              <div className={styles.solutionSummary}>
                <article>
                  <span>jobId</span>
                  <strong>{solution.jobId}</strong>
                </article>
                <article>
                  <span>movimentos</span>
                  <strong>{solution.logicalMoves.length}</strong>
                </article>
              </div>
              <p className={styles.moveLine}>
                {solution.logicalMoves.length > 0
                  ? solution.logicalMoves.join(" ")
                  : "Cubo já está resolvido."}
              </p>
              <details className={styles.solutionDetails}>
                <summary>Ver payload completo da API</summary>
                <pre className={styles.solutionJson}>
                  {JSON.stringify(solution, null, 2)}
                </pre>
              </details>
              {solveSession ? (
                <div className={styles.executionActions}>
                  <p className={styles.redirectNotice}>
                    Sessão salva. Abrindo execução 3D...
                  </p>
                  <button type="button" onClick={() => router.push("/solve")}>
                    Abrir agora
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p>
              Quando a solução ficar pronta, os movimentos e o acesso para a
              animação aparecem aqui.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function createEmptyEditableCubeState(): EditableCubeState {
  return {
    U: [null, null, null, null, "white", null, null, null, null],
    R: [null, null, null, null, "red", null, null, null, null],
    F: [null, null, null, null, "green", null, null, null, null],
    D: [null, null, null, null, "yellow", null, null, null, null],
    L: [null, null, null, null, "orange", null, null, null, null],
    B: [null, null, null, null, "blue", null, null, null, null],
  };
}

function toEditableCube(cubeState: CubeState): EditableCubeState {
  return {
    U: [...cubeState.U],
    R: [...cubeState.R],
    F: [...cubeState.F],
    D: [...cubeState.D],
    L: [...cubeState.L],
    B: [...cubeState.B],
  };
}

function cloneEditableCube(cubeState: EditableCubeState): EditableCubeState {
  return {
    U: [...cubeState.U],
    R: [...cubeState.R],
    F: [...cubeState.F],
    D: [...cubeState.D],
    L: [...cubeState.L],
    B: [...cubeState.B],
  };
}

function countColors(cubeState: EditableCubeState): Record<Color, number> {
  const count = COLOR_ORDER.reduce(
    (accumulator, color) => {
      accumulator[color] = 0;
      return accumulator;
    },
    {} as Record<Color, number>,
  );

  for (const face of FACE_ORDER) {
    for (const sticker of cubeState[face]) {
      if (!sticker) {
        continue;
      }
      count[sticker] += 1;
    }
  }

  return count;
}

function countFilledStickers(cubeState: EditableCubeState) {
  let total = 0;

  for (const face of FACE_ORDER) {
    for (const sticker of cubeState[face]) {
      if (sticker) {
        total += 1;
      }
    }
  }

  return total;
}

function getSolveButtonLabel({
  isSolving,
  missingStickers,
  hasBalancedColors,
}: {
  isSolving: boolean;
  missingStickers: number;
  hasBalancedColors: boolean;
}) {
  if (isSolving) {
    return "Resolvendo...";
  }
  if (missingStickers > 0) {
    return `Faltam ${missingStickers}`;
  }
  if (!hasBalancedColors) {
    return "Ajustar contagem";
  }
  return "Resolver cubo";
}

function getReadinessErrors(
  missingStickers: number,
  hasBalancedColors: boolean,
): string[] {
  const errors: string[] = [];

  if (missingStickers > 0) {
    errors.push(`Preencha os ${missingStickers} stickers restantes.`);
  }
  if (!hasBalancedColors) {
    errors.push("Cada cor precisa aparecer exatamente 9 vezes.");
  }

  return errors;
}

function getSolveStepClassName(
  currentPhase: SolvePhase,
  stepPhase: SolvePhase,
): "stepIdle" | "stepActive" | "stepDone" | "stepError" {
  if (currentPhase === "error") {
    return "stepError";
  }

  const currentProgress = SOLVE_PHASE_PROGRESS[currentPhase];
  const stepProgress = SOLVE_PHASE_PROGRESS[stepPhase];

  if (currentPhase === stepPhase) {
    return "stepActive";
  }
  if (currentProgress > stepProgress || currentPhase === "done") {
    return "stepDone";
  }
  return "stepIdle";
}

function formatElapsed(elapsedMs: number) {
  return `${(elapsedMs / 1000).toFixed(1)}s`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SOLVE_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
