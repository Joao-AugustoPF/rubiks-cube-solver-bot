"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  readFaceFromImageData,
  type FaceReadResult,
  type GuideRect,
  type GuideSource,
} from "@/lib/scanner";
import { createSolveSession, saveSolveSession } from "@/lib/solve-session";
import { useCameraStream } from "@/hooks/useCameraStream";
import { FaceStickerGrid } from "./FaceStickerGrid";
import { ScannerFaceGuide3D } from "./ScannerFaceGuide3D";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";
import styles from "./CubeScannerFlow.module.css";

type CaptureStage = "capture" | "review";
type AutoScanStatus = "idle" | "scanning" | "preview";
type CapturedFaces = Partial<Record<Face, FaceStickers>>;

interface LiveGuideState {
  rect: GuideRect;
  frameWidth: number;
  frameHeight: number;
  source: GuideSource;
  confidence: number;
}

const AUTO_SCAN_INTERVAL_MS = 420;
const AUTO_SCAN_MIN_CONFIDENCE = 0.58;
const AUTO_SCAN_STABLE_FRAMES = 3;

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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoScanIntervalRef = useRef<number | null>(null);
  const stableReadRef = useRef<{ key: string; count: number } | null>(null);
  const { status, stream, error, start, stop } = useCameraStream();

  const [stage, setStage] = useState<CaptureStage>("capture");
  const [autoScanStatus, setAutoScanStatus] = useState<AutoScanStatus>("idle");
  const [shouldAutoScanOnReady, setShouldAutoScanOnReady] = useState(false);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [capturedFaces, setCapturedFaces] = useState<CapturedFaces>({});
  const [draftRead, setDraftRead] = useState<FaceReadResult | null>(null);
  const [activeColor, setActiveColor] = useState<Color>("white");
  const [frozenFrameSrc, setFrozenFrameSrc] = useState<string | null>(null);
  const [liveGuide, setLiveGuide] = useState<LiveGuideState | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [latestConfidence, setLatestConfidence] = useState<number | null>(null);
  const [stableFrames, setStableFrames] = useState(0);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [solveSession, setSolveSession] = useState<SolveSession | null>(null);

  const currentFace = FACE_ORDER[currentFaceIndex];
  const isLastFace = currentFaceIndex === FACE_ORDER.length - 1;
  const completedFaces = Object.keys(capturedFaces).length;

  const stopAutoScanLoop = useCallback(() => {
    if (autoScanIntervalRef.current !== null) {
      window.clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAutoScanLoop();
      stop();
    };
  }, [stop, stopAutoScanLoop]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!stream) {
      video.pause();
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;
    const playPromise = video.play();
    void playPromise?.catch((playError: unknown) => {
      if (
        playError instanceof DOMException &&
        playError.name === "AbortError"
      ) {
        return;
      }
    });

    return () => {
      video.pause();
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stage !== "capture" || status === "ready") {
      return;
    }
    stopAutoScanLoop();
    setAutoScanStatus("idle");
    setShouldAutoScanOnReady(false);
    setLiveGuide(null);
  }, [stage, status, stopAutoScanLoop]);

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

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return null;
    }
    if (video.readyState < 2) {
      return null;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      return null;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return null;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    return {
      canvas,
      imageData: context.getImageData(0, 0, width, height),
    };
  }, []);

  const processAutoScanFrame = useCallback(() => {
    const frame = captureCurrentFrame();
    if (!frame) {
      return;
    }

    const readResult = readFaceFromImageData(frame.imageData);
    setLiveGuide({
      rect: readResult.guideRect,
      frameWidth: frame.imageData.width,
      frameHeight: frame.imageData.height,
      source: readResult.guideSource,
      confidence: readResult.guideConfidence,
    });
    setLatestConfidence(readResult.averageConfidence);

    if (readResult.averageConfidence < AUTO_SCAN_MIN_CONFIDENCE) {
      stableReadRef.current = null;
      setStableFrames(0);
      return;
    }

    const key = readResult.stickers.join("|");
    const nextCount =
      stableReadRef.current?.key === key ? stableReadRef.current.count + 1 : 1;

    stableReadRef.current = {
      key,
      count: nextCount,
    };
    setStableFrames(nextCount);

    if (nextCount < AUTO_SCAN_STABLE_FRAMES) {
      return;
    }

    stopAutoScanLoop();
    setDraftRead(readResult);
    setFrozenFrameSrc(frame.canvas.toDataURL("image/jpeg", 0.92));
    setAutoScanStatus("preview");
    setRequestError(null);
  }, [captureCurrentFrame, stopAutoScanLoop]);

  useEffect(() => {
    if (status !== "ready" || !shouldAutoScanOnReady) {
      return;
    }

    setShouldAutoScanOnReady(false);
    stopAutoScanLoop();
    stableReadRef.current = null;
    setDraftRead(null);
    setFrozenFrameSrc(null);
    setLiveGuide(null);
    setLatestConfidence(null);
    setStableFrames(0);
    setRequestError(null);
    setAutoScanStatus("scanning");

    autoScanIntervalRef.current = window.setInterval(
      processAutoScanFrame,
      AUTO_SCAN_INTERVAL_MS,
    );
    processAutoScanFrame();
  }, [processAutoScanFrame, shouldAutoScanOnReady, status, stopAutoScanLoop]);

  const startAutoScan = useCallback(async () => {
    if (status === "requesting") {
      setShouldAutoScanOnReady(true);
      return;
    }

    if (status !== "ready") {
      setRequestError(null);
      setShouldAutoScanOnReady(true);
      await start();
      return;
    }

    setShouldAutoScanOnReady(true);
  }, [start, status]);

  const handleRescan = () => {
    startAutoScan();
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
      setRequestError("Espere a imagem pausar automaticamente antes de confirmar.");
      return;
    }

    setCapturedFaces((current) => ({
      ...current,
      [currentFace]: draftRead.stickers,
    }));
    setDraftRead(null);
    setFrozenFrameSrc(null);
    setLiveGuide(null);
    setLatestConfidence(null);
    setStableFrames(0);
    setRequestError(null);

    if (isLastFace) {
      stopAutoScanLoop();
      setAutoScanStatus("idle");
      setStage("review");
      stop();
      return;
    }

    setCurrentFaceIndex((current) => current + 1);
    startAutoScan();
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
    stopAutoScanLoop();
    setStage("capture");
    setAutoScanStatus("idle");
    setShouldAutoScanOnReady(false);
    setDraftRead(null);
    setFrozenFrameSrc(null);
    setLiveGuide(null);
    setLatestConfidence(null);
    setStableFrames(0);
    stop();
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
      setRequestError("Erro de comunicação com a API de solução.");
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <section className={styles.scanner}>
      <div className={styles.topGrid}>
        <div className={styles.palette}>
          {COLOR_ORDER.map((color) => (
            <button
              key={color}
              type="button"
              className={`${styles.colorButton} ${activeColor === color ? styles.colorButtonActive : ""
                } ${COLOR_TEXT_CLASS[color]}`}
              style={{ backgroundColor: COLOR_HEX[color] }}
              onClick={() => setActiveColor(color)}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>

        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div>
              <strong>{stage === "capture" ? "Captura em andamento" : "Revisao final"}</strong>
              <p>
                {stage === "capture"
                  ? `Face atual: ${currentFace} (${currentFaceIndex + 1}/6)`
                  : "Todas as 6 faces foram lidas. Ajuste antes de resolver."}
              </p>
            </div>
            <span className={styles.progressCount}>{completedFaces}/6</span>
          </div>

          <div className={styles.faceRail}>
            {FACE_ORDER.map((face) => {
              const isDone = Boolean(capturedFaces[face]);
              const isCurrent = stage === "capture" && face === currentFace;

              return (
                <span
                  key={face}
                  className={`${styles.faceChip} ${isDone ? styles.faceChipDone : ""
                    } ${isCurrent ? styles.faceChipCurrent : ""}`}
                >
                  {face}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {stage === "capture" ? (
        <>
          <div className={styles.captureLayout}>
            <div className={styles.captureMain}>
              <div className={styles.captureHeader}>
                <span className={styles.sectionTag}>passo atual</span>
                <h2>
                  Captura guiada da face {currentFace} ({currentFaceIndex + 1}/6)
                </h2>
                <p>{FACE_INSTRUCTION[currentFace]}</p>
              </div>

              <div className={styles.cameraPanel}>
                <div ref={viewportRef} className={styles.cameraViewport}>
                  {status === "ready" ? (
                    <>
                      <video
                        ref={videoRef}
                        className={styles.video}
                        playsInline
                        muted
                        autoPlay
                      />
                      {!frozenFrameSrc ? (
                        <ScannerGuideOverlay
                          guideRect={liveGuide?.rect}
                          frameWidth={liveGuide?.frameWidth}
                          frameHeight={liveGuide?.frameHeight}
                          viewportWidth={viewportSize?.width}
                          viewportHeight={viewportSize?.height}
                          detected={liveGuide?.source === "detected"}
                        />
                      ) : null}
                      {frozenFrameSrc ? (
                        <div className={styles.frozenLayer}>
                          <img
                            src={frozenFrameSrc}
                            alt={`Prévia congelada da face ${currentFace}`}
                            className={styles.video}
                          />
                        </div>
                      ) : null}
                      <div className={styles.viewportBadge}>
                        {autoScanStatus === "preview"
                          ? "Imagem pausada para revisão"
                          : autoScanStatus === "scanning"
                            ? "Escaneando automaticamente"
                            : "Pronto para iniciar"}
                      </div>
                    </>
                  ) : (
                    <div className={styles.cameraFallback}>
                      {status === "requesting" ? (
                        <p>Solicitando acesso à câmera...</p>
                      ) : status === "idle" ? (
                        <>
                          <p>
                            A câmera fica desligada até você iniciar a captura nesta tela.
                          </p>
                          <button type="button" onClick={() => void startAutoScan()}>
                            Abrir câmera e iniciar captura
                          </button>
                        </>
                      ) : (
                        <>
                          <p>{error ?? "A câmera não está ativa."}</p>
                          {error?.includes("HTTPS ou localhost") ? (
                            <p>
                              Para testar no celular, abra o app por HTTPS. Em
                              desenvolvimento, rode <code>npm run dev:mobile</code>.
                            </p>
                          ) : null}
                          <button type="button" onClick={() => void startAutoScan()}>
                            Tentar novamente
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className={styles.hiddenCanvas} />

                <div className={styles.captureActions}>
                  {draftRead ? (
                    <>
                      <button type="button" onClick={handleConfirmFace}>
                        {isLastFace ? "Confirmar e ir para revisão" : "Confirmar face"}
                      </button>
                      <button type="button" onClick={handleRescan}>
                        Escanear novamente
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startAutoScan()}
                      disabled={autoScanStatus === "scanning" || status === "requesting"}
                    >
                      {autoScanStatus === "scanning"
                        ? "Escaneando automaticamente..."
                        : status === "requesting"
                          ? "Abrindo câmera..."
                          : status === "idle"
                            ? "Abrir câmera e iniciar escaneamento"
                            : completedFaces === 0
                              ? "Iniciar escaneamento automático"
                              : "Escanear próxima face"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <aside className={styles.captureSidebar}>
              <ScannerFaceGuide3D face={currentFace} />

              <div className={styles.captureMeta}>
                <span className={styles.sectionTag}>situacao</span>
                <p>
                  Faces confirmadas: {completedFaces}/6. Sempre revise e corrija antes
                  de resolver.
                </p>
              {draftRead ? (
                  <>
                    <p>
                      Leitura pausada com confiança média de{" "}
                      {(draftRead.averageConfidence * 100).toFixed(1)}%. Se estiver
                      baixa, toque em escanear novamente.
                    </p>
                    {draftRead.guideSource === "detected" ? (
                      <p>
                        Cubo detectado no frame, e a área de leitura foi ajustada automaticamente.
                      </p>
                    ) : (
                      <p>
                        Ainda usamos a área padrão. Tente deixar a face inteira visível e
                        mais centralizada.
                      </p>
                    )}
                  </>
                ) : autoScanStatus === "scanning" ? (
                  <>
                    {liveGuide?.source === "detected" ? (
                      <p>
                        Cubo detectado. A área de leitura foi ajustada automaticamente para
                        a face visível, sem exigir que você aproxime tanto da câmera.
                      </p>
                    ) : (
                      <p>
                        Ainda procurando o cubo no frame. Deixe a face inteira visível e
                        evite aproximar demais para não perder luz.
                      </p>
                    )}
                    <p>
                      Estabilidade: {stableFrames}/{AUTO_SCAN_STABLE_FRAMES}
                      {latestConfidence !== null
                        ? ` · confiança ${(latestConfidence * 100).toFixed(1)}%`
                        : ""}
                      {liveGuide?.source === "detected"
                        ? ` · detecção ${(liveGuide.confidence * 100).toFixed(1)}%`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p>
                    Toque em iniciar e só foque em mostrar o cubo inteiro. O sistema vai
                    localizar a face, ajustar a área de leitura, pausar e pedir
                    confirmação quando estiver consistente.
                  </p>
                )}
              </div>

              {draftRead ? (
                <div className={styles.previewBlock}>
                  <h3>Confira se a face {currentFace} está correta</h3>
                  <FaceStickerGrid
                    face={currentFace}
                    stickers={draftRead.stickers}
                    editable
                    activeColor={activeColor}
                    onChangeSticker={handleChangeDraftSticker}
                  />
                </div>
              ) : (
                <div className={styles.helperCard}>
                  <span className={styles.sectionTag}>antes de confirmar</span>
                  <ul>
                    <li>Mostre a face inteira, sem encostar demais o cubo na câmera.</li>
                    <li>O quadro vai se reposicionar quando o cubo for detectado.</li>
                    <li>Se congelar errado, toque em escanear novamente.</li>
                    <li>Se congelar certo, confirme e o fluxo já segue para a próxima face.</li>
                  </ul>
                </div>
              )}
            </aside>
          </div>

          <div className={styles.captureMetaBar}>
            <p>
              Resultado esperado desta etapa: o scanner localizar a face {currentFace},
              ajustar a área automaticamente e congelar sozinho quando a leitura estiver
              estável, para você só revisar e confirmar.
            </p>
          </div>
        </>
      ) : (
        <>
              <div className={styles.reviewHeader}>
            <span className={styles.sectionTag}>revisão final</span>
            <h2>Confira as 6 faces antes de validar no backend</h2>
            <p>
              Corrija qualquer sticker clicando na grade com a cor selecionada.
              Esse é o último checkpoint antes da solução.
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

          <div className={styles.reviewBottomGrid}>
            <div className={styles.validationBlock}>
              <span className={styles.sectionTag}>validação local</span>
              <h3>Consistência antes do envio</h3>
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
              <span className={styles.sectionTag}>ações</span>
              <div className={styles.reviewActionButtons}>
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
            </div>
          </div>
        </>
      )}

      {requestError ? (
        <p role="alert" className={styles.errorBanner}>
          {requestError}
        </p>
      ) : null}
      {validationErrors.length > 0 ? (
        <ul role="alert" className={styles.errorList}>
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
