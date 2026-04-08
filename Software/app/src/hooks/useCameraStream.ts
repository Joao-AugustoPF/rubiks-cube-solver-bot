"use client";

import { useCallback, useEffect, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

interface UseCameraStreamResult {
  status: CameraStatus;
  stream: MediaStream | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: {
      ideal: "environment",
    },
    width: {
      ideal: 1280,
    },
    height: {
      ideal: 720,
    },
  },
};

export function useCameraStream(): UseCameraStreamResult {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    setStatus("idle");
    setError(null);
    setStream((current) => {
      if (current) {
        current.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setStatus("error");
      setError("Navegador sem suporte a getUserMedia.");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        CAMERA_CONSTRAINTS,
      );
      setStream(mediaStream);
      setStatus("ready");
    } catch (cameraError) {
      setStatus("error");
      setError(getCameraErrorMessage(cameraError));
    }
  }, []);

  useEffect(() => stop, [stop]);

  return {
    status,
    stream,
    error,
    start,
    stop,
  };
}

function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "Não foi possível iniciar a câmera. Verifique as permissões.";
  }

  if (error.name === "NotAllowedError") {
    return "Permissão da câmera negada. Libere o acesso e tente novamente.";
  }

  if (error.name === "NotFoundError") {
    return "Nenhuma câmera encontrada neste dispositivo.";
  }

  if (error.name === "NotReadableError") {
    return "A câmera está em uso por outro aplicativo.";
  }

  if (error.name === "OverconstrainedError") {
    return "Configuração de câmera não suportada neste dispositivo.";
  }

  return "Falha ao iniciar câmera. Tente novamente.";
}
