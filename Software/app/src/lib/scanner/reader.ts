import type { Color, FaceStickers } from "@/types";
import { classifyCubeColor, type ColorDetectionResult, type RGB } from "./color";

export interface GuideRect {
  x: number;
  y: number;
  size: number;
}

export interface FaceReadResult {
  stickers: FaceStickers;
  samples: ColorDetectionResult[];
  averageConfidence: number;
  guideRect: GuideRect;
}

export interface FaceReadOptions {
  guideScale?: number;
  sampleRadiusRatio?: number;
}

export function computeGuideRect(
  width: number,
  height: number,
  guideScale = 0.62,
): GuideRect {
  const size = Math.floor(Math.min(width, height) * guideScale);
  const x = Math.floor((width - size) / 2);
  const y = Math.floor((height - size) / 2);

  return { x, y, size };
}

export function readFaceFromImageData(
  imageData: Pick<ImageData, "width" | "height" | "data">,
  options?: FaceReadOptions,
): FaceReadResult {
  const guideScale = options?.guideScale ?? 0.62;
  const sampleRadiusRatio = options?.sampleRadiusRatio ?? 0.18;

  const guideRect = computeGuideRect(imageData.width, imageData.height, guideScale);
  const cellSize = guideRect.size / 3;
  const sampleRadius = Math.max(2, Math.floor(cellSize * sampleRadiusRatio));
  const samples: ColorDetectionResult[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const centerX = Math.floor(guideRect.x + column * cellSize + cellSize / 2);
      const centerY = Math.floor(guideRect.y + row * cellSize + cellSize / 2);
      const rgb = sampleAverageRgb(imageData, centerX, centerY, sampleRadius);
      samples.push(classifyCubeColor(rgb));
    }
  }

  const stickers = samples.map((sample) => sample.color) as FaceStickers;
  const averageConfidence =
    samples.reduce((acc, sample) => acc + sample.confidence, 0) / samples.length;

  return {
    stickers,
    samples,
    averageConfidence,
    guideRect,
  };
}

function sampleAverageRgb(
  imageData: Pick<ImageData, "width" | "height" | "data">,
  centerX: number,
  centerY: number,
  radius: number,
): RGB {
  const { width, height, data } = imageData;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let sampleCount = 0;

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    if (y < 0 || y >= height) {
      continue;
    }
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || x >= width) {
        continue;
      }
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }

      const pixelIndex = (y * width + x) * 4;
      totalR += data[pixelIndex];
      totalG += data[pixelIndex + 1];
      totalB += data[pixelIndex + 2];
      sampleCount += 1;
    }
  }

  if (sampleCount === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.round(totalR / sampleCount),
    g: Math.round(totalG / sampleCount),
    b: Math.round(totalB / sampleCount),
  };
}
