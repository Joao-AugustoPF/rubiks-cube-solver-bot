import type { Color } from "@/types";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface ColorDetectionResult {
  color: Color;
  confidence: number;
  rgb: RGB;
  hsv: HSV;
}

const COLOR_PROTOTYPES: Record<Color, HSV> = {
  white: { h: 0, s: 0.03, v: 0.96 },
  yellow: { h: 56, s: 0.78, v: 0.94 },
  orange: { h: 30, s: 0.88, v: 0.9 },
  red: { h: 0, s: 0.86, v: 0.86 },
  green: { h: 130, s: 0.75, v: 0.77 },
  blue: { h: 220, s: 0.78, v: 0.75 },
};

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const nr = clamp01(r / 255);
  const ng = clamp01(g / 255);
  const nb = clamp01(b / 255);

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === nr) {
      hue = 60 * (((ng - nb) / delta) % 6);
    } else if (max === ng) {
      hue = 60 * ((nb - nr) / delta + 2);
    } else {
      hue = 60 * ((nr - ng) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  const saturation = max === 0 ? 0 : delta / max;
  return {
    h: hue,
    s: saturation,
    v: max,
  };
}

export function classifyCubeColor(rgb: RGB): ColorDetectionResult {
  const hsv = rgbToHsv(rgb);

  if (hsv.s < 0.18 && hsv.v > 0.52) {
    return {
      color: "white",
      confidence: clamp01((0.25 - hsv.s) * 3 + (hsv.v - 0.52)),
      rgb,
      hsv,
    };
  }

  let best: { color: Color; score: number } = { color: "red", score: Infinity };

  for (const [color, prototype] of Object.entries(COLOR_PROTOTYPES) as Array<
    [Color, HSV]
  >) {
    const hueDistance = circularHueDistance(hsv.h, prototype.h) / 180;
    const saturationDistance = Math.abs(hsv.s - prototype.s);
    const valueDistance = Math.abs(hsv.v - prototype.v);

    const score = hueDistance * 0.68 + saturationDistance * 0.22 + valueDistance * 0.1;
    if (score < best.score) {
      best = { color, score };
    }
  }

  return {
    color: best.color,
    confidence: clamp01(1 - best.score),
    rgb,
    hsv,
  };
}

function circularHueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
