type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  onSuccess: (stream: MediaStream) => void,
  onError: (error: DOMException) => void,
) => void;

type NavigatorWithLegacyGetUserMedia = Navigator & {
  getUserMedia?: LegacyGetUserMedia;
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
  msGetUserMedia?: LegacyGetUserMedia;
};

function getLegacyGetUserMedia(
  navigatorLike: NavigatorWithLegacyGetUserMedia,
): LegacyGetUserMedia | null {
  return (
    navigatorLike.getUserMedia ??
    navigatorLike.webkitGetUserMedia ??
    navigatorLike.mozGetUserMedia ??
    navigatorLike.msGetUserMedia ??
    null
  );
}

export function hasCameraSupport(
  navigatorLike: NavigatorWithLegacyGetUserMedia | undefined,
): boolean {
  if (!navigatorLike) {
    return false;
  }

  return (
    typeof navigatorLike.mediaDevices?.getUserMedia === "function" ||
    typeof getLegacyGetUserMedia(navigatorLike) === "function"
  );
}

export function getCameraUnavailableMessage(options: {
  isSecureContext: boolean;
  navigatorLike?: NavigatorWithLegacyGetUserMedia;
}): string {
  const { isSecureContext, navigatorLike } = options;

  if (!isSecureContext) {
    return 'A câmera do navegador exige HTTPS ou localhost. No celular, abra este app por HTTPS. Em desenvolvimento, use "npm run dev:mobile".';
  }

  if (!navigatorLike) {
    return "Não foi possível acessar a API de câmera neste navegador.";
  }

  return "Navegador sem suporte à câmera.";
}

export async function requestUserMedia(
  navigatorLike: NavigatorWithLegacyGetUserMedia,
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  if (typeof navigatorLike.mediaDevices?.getUserMedia === "function") {
    return navigatorLike.mediaDevices.getUserMedia(constraints);
  }

  const legacyGetUserMedia = getLegacyGetUserMedia(navigatorLike);
  if (!legacyGetUserMedia) {
    throw new DOMException("Camera API unavailable", "NotSupportedError");
  }

  return new Promise<MediaStream>((resolve, reject) => {
    legacyGetUserMedia.call(navigatorLike, constraints, resolve, reject);
  });
}
