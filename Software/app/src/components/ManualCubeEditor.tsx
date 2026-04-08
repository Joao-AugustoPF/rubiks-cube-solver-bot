"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  COLOR_ORDER,
  FACE_ORDER,
  type Color,
  type CubeState,
  type Face,
  type SolveCubeApiResponse,
  type SolveSession,
} from "@/types";
import { createSolvedCube } from "@/lib/cube";
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
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

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

  const colorCount = useMemo(() => countColors(cube), [cube]);
  const filledStickers = useMemo(() => countFilledStickers(cube), [cube]);
  const missingStickers = 54 - filledStickers;

  const handlePaintSticker = (face: Face, index: number) => {
    setCube((current) => {
      const next = cloneEditableCube(current);
      next[face][index] = activeColor;
      return next;
    });
  };

  const handleClearSticker = (face: Face, index: number) => {
    setCube((current) => {
      const next = cloneEditableCube(current);
      next[face][index] = null;
      return next;
    });
  };

  const handleResetSolved = () => {
    setCube(toEditableCube(createSolvedCube()));
    setValidationErrors([]);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
  };

  const handleClearCube = () => {
    setCube(createEmptyEditableCubeState());
    setValidationErrors([]);
    setRequestError(null);
    setSolution(null);
    setSolveSession(null);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setRequestError(null);
    setSolution(null);

    try {
      const response = await fetch("/api/cube/validate", {
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
    setIsSolving(true);
    setRequestError(null);
    setSolution(null);

    try {
      const response = await fetch("/api/cube/solve", {
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
        setValidationErrors(maybeErrorPayload.errors ?? []);
        setRequestError(
          maybeErrorPayload.message ??
            "Falha ao resolver cubo. Revise o estado informado.",
        );
        return;
      }

      setValidationErrors([]);
      const solveResponse = payload as SolveCubeApiResponse;
      setSolution(solveResponse);
      const session = createSolveSession(solveResponse);
      saveSolveSession(session);
      setSolveSession(session);
    } catch {
      setRequestError(
        "Erro de comunicação ao resolver cubo. Verifique a API e tente novamente.",
      );
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <section className={styles.editor}>
      <div className={styles.topGrid}>
        <div className={styles.toolbar}>
          <span className={styles.sectionTag}>paleta ativa</span>
          <div className={styles.palette}>
            {COLOR_ORDER.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorButton} ${
                  activeColor === color ? styles.colorButtonActive : ""
                } ${COLOR_TEXT_CLASS[color]}`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                onClick={() => setActiveColor(color)}
              >
                {COLOR_LABEL[color]}
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={handleResetSolved}>
              Estado resolvido
            </button>
            <button type="button" onClick={handleClearCube}>
              Limpar cubo
            </button>
            <button type="button" onClick={handleValidate} disabled={isValidating}>
              {isValidating ? "Validando..." : "Validar"}
            </button>
            <button type="button" onClick={handleSolve} disabled={isSolving}>
              {isSolving ? "Resolvendo..." : "Resolver"}
            </button>
          </div>
        </div>

        <div className={styles.howToCard}>
          <span className={styles.sectionTag}>como usar</span>
          <div className={styles.stepList}>
            <article>
              <strong>1. Escolha uma cor</strong>
              <p>Selecione uma cor na paleta e clique nos stickers para pintar.</p>
            </article>
            <article>
              <strong>2. Revise a contagem</strong>
              <p>As 6 cores devem fechar em 9 stickers cada antes da solução.</p>
            </article>
            <article>
              <strong>3. Valide e execute</strong>
              <p>Depois da validação, gere a sessão e siga para a tela de execução.</p>
            </article>
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span>stickers preenchidos</span>
          <strong>{filledStickers} / 54</strong>
        </article>
        <article className={styles.metricCard}>
          <span>faltando</span>
          <strong>{missingStickers}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>cor ativa</span>
          <strong>{COLOR_LABEL[activeColor]}</strong>
        </article>
      </div>

      <div className={styles.statusGrid}>
        <div className={styles.colorCount}>
          <span className={styles.sectionTag}>contagem por cor</span>
          <h3>Contagem por cor</h3>
          <ul>
            {COLOR_ORDER.map((color) => (
              <li key={color}>
                <span
                  className={styles.colorBadge}
                  style={{ backgroundColor: COLOR_HEX[color] }}
                />
                <span>{COLOR_LABEL[color]}</span>
                <strong>{colorCount[color]} / 9</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.feedback}>
          <span className={styles.sectionTag}>retorno</span>
          <h3>Mensagens</h3>
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
            <p className={styles.success}>Nenhum erro de validação no momento.</p>
          )}
        </div>
      </div>

      <div className={styles.workspaceGrid}>
        <div className={styles.preview}>
          <span className={styles.sectionTag}>área de trabalho</span>
          <h3>Pré-visualização 2D do cubo (URFDLB)</h3>
          <p>
            Clique em um sticker para pintar com a cor selecionada. Clique com o
            botão direito para limpar o sticker.
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
                      aria-label={`Face ${face}, posição ${index}`}
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
          {solution ? (
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
                  <button type="button" onClick={() => router.push("/solve")}>
                    Executar animação da solução
                  </button>
                  <Link href="/solve" className={styles.executionLink}>
                    Abrir página de execução
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <p>
              A resposta da solução aparece aqui com jobId, quantidade de movimentos
              e acesso direto para a tela de execução.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function createEmptyEditableCubeState(): EditableCubeState {
  return {
    U: [null, null, null, null, null, null, null, null, null],
    R: [null, null, null, null, null, null, null, null, null],
    F: [null, null, null, null, null, null, null, null, null],
    D: [null, null, null, null, null, null, null, null, null],
    L: [null, null, null, null, null, null, null, null, null],
    B: [null, null, null, null, null, null, null, null, null],
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
