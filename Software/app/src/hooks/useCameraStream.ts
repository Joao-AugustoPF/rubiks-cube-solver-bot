"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCameraUnavailableMessage,
  hasCameraSupport,
  requestUserMedia,
} from "@/lib/camera/support";

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
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const releaseStream = useCallback((target: MediaStream | null) => {
    if (!target) {
      return;
    }

    target.getTracks().forEach((track) => track.stop());
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    releaseStream(streamRef.current);
    streamRef.current = null;

    if (!mountedRef.current) {
      return;
    }

    setStream(null);
    setStatus("idle");
    setError(null);
  }, [releaseStream]);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setStatus("error");
      setError(
        getCameraUnavailableMessage({
          isSecureContext: false,
        }),
      );
      return;
    }

    if (!hasCameraSupport(navigator)) {
      setStatus("error");
      setError(
        getCameraUnavailableMessage({
          isSecureContext: window.isSecureContext,
          navigatorLike: navigator,
        }),
      );
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (streamRef.current) {
      releaseStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
    }

    setStatus("requesting");
    setError(null);

    try {
      const mediaStream = await requestUserMedia(navigator, CAMERA_CONSTRAINTS);

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        releaseStream(mediaStream);
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("ready");
    } catch (cameraError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setStatus("error");
      setError(getCameraErrorMessage(cameraError));
    }
  }, [releaseStream]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      releaseStream(streamRef.current);
      streamRef.current = null;
    };
  }, [releaseStream]);

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
