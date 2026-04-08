"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  COLOR_ORDER,
  FACE_ORDER,
  type Color,
  type Face,
  type FaceStickers,
  type SolveCubeApiResponse,
  type SolveSession,
} from "@/types";
import { createSolvedCube, validateCubeState } from "@/lib/cube";
import { readFaceFromImageData, type FaceReadResult } from "@/lib/scanner";
import { createSolveSession, saveSolveSession } from "@/lib/solve-session";
import { useCameraStream } from "@/hooks/useCameraStream";
import { FaceStickerGrid } from "./FaceStickerGrid";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";
import styles from "./CubeScannerFlow.module.css";

type CaptureStage = "capture" | "review";
type CapturedFaces = Partial<Record<Face, FaceStickers>>;

const FACE_INSTRUCTION: Record<Face, string> = {
  U: "Posicione a face U (topo) no centro do guia.",
  R: "Gire o cubo e posicione a face R (direita).",
  F: "Agora capture a face F (frente).",
  D: "Gire para baixo e capture a face D.",
  L: "Capture a face L (esquerda).",
  B: "Por fim, capture a face B (trás).",
};

const COLOR_LABEL: Record<Color, string> = {
  white: "Branco",
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  orange: "Laranja",
  blue: "Azul",
};

const COLOR_HEX: Record<Color, string> = {
  white: "#f8fafc",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  blue: "#3b82f6",
};

const COLOR_TEXT_CLASS: Record<Color, string> = {
  white: styles.darkText,
  yellow: styles.darkText,
  orange: styles.darkText,
  red: styles.lightText,
  green: styles.lightText,
  blue: styles.lightText,
};

export function CubeScannerFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, stream, error, start, stop } = useCameraStream();

  const [stage, setStage] = useState<CaptureStage>("capture");
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [capturedFaces, setCapturedFaces] = useState<CapturedFaces>({});
  const [draftRead, setDraftRead] = useState<FaceReadResult | null>(null);
  const [activeColor, setActiveColor] = useState<Color>("white");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [solveSession, setSolveSession] = useState<SolveSession | null>(null);

  const currentFace = FACE_ORDER[currentFaceIndex];
  const isLastFace = currentFaceIndex === FACE_ORDER.length - 1;
  const completedFaces = Object.keys(capturedFaces).length;

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      return;
    }
    video.srcObject = stream;
    void video.play();
  }, [stream]);

  const reviewCubeState = useMemo(() => {
    if (!isCaptureComplete(capturedFaces)) {
      return null;
    }
    return toCubeState(capturedFaces);
  }, [capturedFaces]);

  const localValidation = useMemo(() => {
    if (!reviewCubeState) {
      return {
        isValid: false,
        errors: ["As 6 faces precisam estar capturadas para validação final."],
      };
    }
    return validateCubeState(reviewCubeState);
  }, [reviewCubeState]);

  const handleReadFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setRequestError("Elementos de vídeo/canvas indisponíveis para leitura.");
      return;
    }
    if (video.readyState < 2) {
      setRequestError("A câmera ainda não está pronta para captura.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      setRequestError("Não foi possível obter frame da câmera.");
      return;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      setRequestError("Falha ao inicializar contexto de leitura de imagem.");
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const readResult = readFaceFromImageData(imageData);
    setDraftRead(readResult);
    setRequestError(null);
  };

  const handleChangeDraftSticker = (index: number, color: Color) => {
    setDraftRead((current) => {
      if (!current) {
        return current;
      }
      const stickers = [...current.stickers] as FaceStickers;
      stickers[index] = color;
      return {
        ...current,
        stickers,
      };
    });
  };

  const handleConfirmFace = () => {
    if (!draftRead) {
      setRequestError("Faça a leitura da face antes de confirmar.");
      return;
    }

    setCapturedFaces((current) => ({
      ...current,
      [currentFace]: draftRead.stickers,
    }));
    setDraftRead(null);
    setRequestError(null);

    if (isLastFace) {
      setStage("review");
      stop();
      return;
    }

    setCurrentFaceIndex((current) => current + 1);
  };

  const handleChangeReviewedSticker = (
    face: Face,
    index: number,
    color: Color,
  ) => {
    setCapturedFaces((current) => {
      const base = current[face] ?? createSolvedCube()[face];
      const nextFace = [...base] as FaceStickers;
      nextFace[index] = color;
      return {
        ...current,
        [face]: nextFace,
      };
    });
  };

  const handleBackToCapture = () => {
    setStage("capture");
    void start();
  };

  const handleValidateWithApi = async () => {
    if (!reviewCubeState) {
      setValidationErrors(["As faces capturadas ainda estão incompletas."]);
      return;
    }

    const response = await fetch("/api/cube/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cubeState: reviewCubeState }),
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
          : [payload.message ?? "Falha de validação no backend."],
      );
      return;
    }
    setValidationErrors([]);
  };

  const handleSolve = async () => {
    if (!reviewCubeState) {
      setValidationErrors(["As faces capturadas ainda estão incompletas."]);
      return;
    }
    setIsSolving(true);
    setRequestError(null);
    setValidationErrors([]);

    try {
      const response = await fetch("/api/cube/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cubeState: reviewCubeState }),
      });
      const payload = (await response.json()) as
        | SolveCubeApiResponse
        | { message?: string; errors?: string[] };

      if (!response.ok) {
        const errorPayload = payload as { message?: string; errors?: string[] };
        setRequestError(
          errorPayload.message ?? "Não foi possível resolver o cubo escaneado.",
        );
        setValidationErrors(errorPayload.errors ?? []);
        return;
      }

      const session = createSolveSession(payload as SolveCubeApiResponse);
      saveSolveSession(session);
      setSolveSession(session);
      router.push("/solve");
    } catch {
      setRequestError("Erro de comunicação com API de solve.");
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <section className={styles.scanner}>
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

      {stage === "capture" ? (
        <>
          <div className={styles.captureHeader}>
            <h2>
              Captura Guiada: face {currentFace} ({currentFaceIndex + 1}/6)
            </h2>
            <p>{FACE_INSTRUCTION[currentFace]}</p>
          </div>

          <div className={styles.cameraPanel}>
            <div className={styles.cameraViewport}>
              {status === "ready" ? (
                <>
                  <video
                    ref={videoRef}
                    className={styles.video}
                    playsInline
                    muted
                    autoPlay
                  />
                  <ScannerGuideOverlay />
                </>
              ) : (
                <div className={styles.cameraFallback}>
                  {status === "requesting" ? (
                    <p>Solicitando acesso à câmera...</p>
                  ) : (
                    <>
                      <p>{error ?? "A câmera não está ativa."}</p>
                      <button type="button" onClick={() => void start()}>
                        Tentar novamente
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />

            <div className={styles.captureActions}>
              <button
                type="button"
                onClick={handleReadFace}
                disabled={status !== "ready"}
              >
                Ler grade 3x3
              </button>
              <button type="button" onClick={handleConfirmFace} disabled={!draftRead}>
                {isLastFace ? "Confirmar e ir para revisão" : "Confirmar face"}
              </button>
            </div>
          </div>

          <div className={styles.captureMeta}>
            <p>
              Faces confirmadas: {completedFaces}/6. Sempre revise e corrija antes
              de resolver.
            </p>
            {draftRead ? (
              <p>
                Confiança média da leitura: {(draftRead.averageConfidence * 100).toFixed(1)}
                %. Se estiver baixa, ajuste iluminação/alinhamento e releia.
              </p>
            ) : null}
          </div>

          {draftRead ? (
            <div className={styles.previewBlock}>
              <h3>Prévia da face {currentFace} (editável)</h3>
              <FaceStickerGrid
                face={currentFace}
                stickers={draftRead.stickers}
                editable
                activeColor={activeColor}
                onChangeSticker={handleChangeDraftSticker}
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className={styles.reviewHeader}>
            <h2>Revisão final das 6 faces</h2>
            <p>
              Corrija qualquer sticker clicando na grade com a cor selecionada.
              Esse passo garante confiabilidade antes do solve.
            </p>
          </div>

          <div className={styles.reviewGrid}>
            {FACE_ORDER.map((face) => (
              <FaceStickerGrid
                key={face}
                face={face}
                stickers={capturedFaces[face] ?? createSolvedCube()[face]}
                editable
                activeColor={activeColor}
                onChangeSticker={(index, color) =>
                  handleChangeReviewedSticker(face, index, color)
                }
              />
            ))}
          </div>

          <div className={styles.validationBlock}>
            <h3>Validação local</h3>
            {localValidation.isValid ? (
              <p className={styles.success}>Estrutura local válida para envio.</p>
            ) : (
              <ul className={styles.errorList}>
                {localValidation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.reviewActions}>
            <button type="button" onClick={handleBackToCapture}>
              Voltar para captura
            </button>
            <button type="button" onClick={() => void handleValidateWithApi()}>
              Validar no backend
            </button>
            <button
              type="button"
              onClick={() => void handleSolve()}
              disabled={isSolving}
            >
              {isSolving ? "Resolvendo..." : "Validar e resolver"}
            </button>
            <Link href="/manual" className={styles.linkButton}>
              Ir para fluxo manual
            </Link>
          </div>
        </>
      )}

      {requestError ? <p className={styles.error}>{requestError}</p> : null}
      {validationErrors.length > 0 ? (
        <ul className={styles.errorList}>
          {validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {solveSession ? (
        <p className={styles.success}>
          Sessão {solveSession.jobId} criada. Redirecionando para animação...
        </p>
      ) : null}
    </section>
  );
}

function isCaptureComplete(capturedFaces: CapturedFaces): capturedFaces is Record<
  Face,
  FaceStickers
> {
  return FACE_ORDER.every((face) => Boolean(capturedFaces[face]));
}

function toCubeState(capturedFaces: Record<Face, FaceStickers>) {
  return {
    U: [...capturedFaces.U] as FaceStickers,
    R: [...capturedFaces.R] as FaceStickers,
    F: [...capturedFaces.F] as FaceStickers,
    D: [...capturedFaces.D] as FaceStickers,
    L: [...capturedFaces.L] as FaceStickers,
    B: [...capturedFaces.B] as FaceStickers,
  };
}
