import type { Color, FaceStickers } from "@/types";
import {
  classifyCubeColor,
  rgbToHsv,
  type ColorDetectionResult,
  type RGB,
} from "./color";

export interface GuideRect {
  x: number;
  y: number;
  size: number;
}

export type GuideSource = "fixed" | "detected";

export interface FaceReadResult {
  stickers: FaceStickers;
  samples: ColorDetectionResult[];
  averageConfidence: number;
  guideRect: GuideRect;
  guideSource: GuideSource;
  guideConfidence: number;
}

export interface FaceReadOptions {
  guideScale?: number;
  sampleRadiusRatio?: number;
  detectCube?: boolean;
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
  const detectCube = options?.detectCube ?? true;
  const fallbackGuide = computeGuideRect(
    imageData.width,
    imageData.height,
    guideScale,
  );

  const cubeGuide = detectCube
    ? detectCubeGuideRect(imageData, guideScale)
    : null;
  const acceptedCubeGuide =
    cubeGuide &&
    isDetectedGuideReliable(cubeGuide.guideRect, cubeGuide.confidence, fallbackGuide)
      ? cubeGuide
      : null;
  const guideRect = acceptedCubeGuide?.guideRect ?? fallbackGuide;
  const cellSize = guideRect.size / 3;
  const sampleRadius = Math.max(2, Math.floor(cellSize * sampleRadiusRatio));
  const samples: ColorDetectionResult[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const stickerIndex = row * 3 + column;
      const centerX = Math.floor(guideRect.x + column * cellSize + cellSize / 2);
      const centerY = Math.floor(guideRect.y + row * cellSize + cellSize / 2);
      samples.push(
        sampleStickerDetection(
          imageData,
          centerX,
          centerY,
          sampleRadius,
          cellSize,
          stickerIndex === 4,
        ),
      );
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
    guideSource: acceptedCubeGuide ? "detected" : "fixed",
    guideConfidence: acceptedCubeGuide?.confidence ?? 0,
  };
}

export function detectCubeGuideRect(
  imageData: Pick<ImageData, "width" | "height" | "data">,
  fallbackGuideScale = 0.62,
): { guideRect: GuideRect; confidence: number } | null {
  const minDimension = Math.min(imageData.width, imageData.height);
  const sampleStep = Math.max(2, Math.floor(minDimension / 96));
  const gridWidth = Math.max(1, Math.floor(imageData.width / sampleStep));
  const gridHeight = Math.max(1, Math.floor(imageData.height / sampleStep));
  const pixelCount = gridWidth * gridHeight;
  const luminance = new Float32Array(pixelCount);
  const saturation = new Float32Array(pixelCount);
  const value = new Float32Array(pixelCount);

  for (let row = 0; row < gridHeight; row += 1) {
    for (let column = 0; column < gridWidth; column += 1) {
      const sampleX = Math.min(
        imageData.width - 1,
        column * sampleStep + Math.floor(sampleStep / 2),
      );
      const sampleY = Math.min(
        imageData.height - 1,
        row * sampleStep + Math.floor(sampleStep / 2),
      );
      const rgb = samplePixel(imageData, sampleX, sampleY);
      const hsv = rgbToHsv(rgb);
      const index = row * gridWidth + column;

      luminance[index] = rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722;
      saturation[index] = hsv.s;
      value[index] = hsv.v;
    }
  }

  const mask = new Uint8Array(pixelCount);
  const contrastMap = new Float32Array(pixelCount);

  for (let row = 1; row < gridHeight - 1; row += 1) {
    for (let column = 1; column < gridWidth - 1; column += 1) {
      const index = row * gridWidth + column;
      const current = luminance[index];
      const contrast =
        Math.max(
          Math.abs(current - luminance[index - 1]),
          Math.abs(current - luminance[index + 1]),
          Math.abs(current - luminance[index - gridWidth]),
          Math.abs(current - luminance[index + gridWidth]),
        ) / 255;

      contrastMap[index] = contrast;

      const colorful = saturation[index] > 0.2 && value[index] > 0.18;
      const structural = contrast > 0.22 && value[index] > 0.16;
      const brightNeutral =
        saturation[index] < 0.16 && value[index] > 0.72 && contrast > 0.08;
      if (colorful || structural || brightNeutral) {
        mask[index] = 1;
      }
    }
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const searchCenterX = gridWidth / 2;
  const searchCenterY = gridHeight / 2;
  const minComponentSpan = Math.max(4, Math.floor(Math.min(gridWidth, gridHeight) * 0.12));
  let bestCandidate: CandidateBounds | null = null;

  for (let startIndex = 0; startIndex < pixelCount; startIndex += 1) {
    if (mask[startIndex] === 0 || visited[startIndex] === 1) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = startIndex;
    tail += 1;
    visited[startIndex] = 1;

    let minColumn = startIndex % gridWidth;
    let maxColumn = minColumn;
    let minRow = Math.floor(startIndex / gridWidth);
    let maxRow = minRow;
    let componentPixels = 0;
    let saturationSum = 0;
    let contrastSum = 0;

    while (head < tail) {
      const index = queue[head];
      head += 1;

      const row = Math.floor(index / gridWidth);
      const column = index % gridWidth;
      componentPixels += 1;
      saturationSum += saturation[index];
      contrastSum += contrastMap[index];

      if (column < minColumn) {
        minColumn = column;
      }
      if (column > maxColumn) {
        maxColumn = column;
      }
      if (row < minRow) {
        minRow = row;
      }
      if (row > maxRow) {
        maxRow = row;
      }

      enqueueIfNeeded(column - 1, row);
      enqueueIfNeeded(column + 1, row);
      enqueueIfNeeded(column, row - 1);
      enqueueIfNeeded(column, row + 1);
    }

    const spanColumns = maxColumn - minColumn + 1;
    const spanRows = maxRow - minRow + 1;
    if (spanColumns < minComponentSpan || spanRows < minComponentSpan) {
      continue;
    }

    const candidate = scoreCandidateBounds(
      minColumn,
      maxColumn,
      minRow,
      maxRow,
      componentPixels,
      saturationSum,
      contrastSum,
      searchCenterX,
      searchCenterY,
      minComponentSpan,
    );

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }

    function enqueueIfNeeded(nextColumn: number, nextRow: number) {
      if (
        nextColumn < 0 ||
        nextColumn >= gridWidth ||
        nextRow < 0 ||
        nextRow >= gridHeight
      ) {
        return;
      }

      const nextIndex = nextRow * gridWidth + nextColumn;
      if (visited[nextIndex] === 1 || mask[nextIndex] === 0) {
        return;
      }

      visited[nextIndex] = 1;
      queue[tail] = nextIndex;
      tail += 1;
    }
  }

  let aggregatedMinColumn = Number.POSITIVE_INFINITY;
  let aggregatedMaxColumn = Number.NEGATIVE_INFINITY;
  let aggregatedMinRow = Number.POSITIVE_INFINITY;
  let aggregatedMaxRow = Number.NEGATIVE_INFINITY;
  let aggregatedPixels = 0;
  let aggregatedSaturation = 0;
  let aggregatedContrast = 0;

  for (let row = 0; row < gridHeight; row += 1) {
    for (let column = 0; column < gridWidth; column += 1) {
      const index = row * gridWidth + column;
      if (mask[index] === 0) {
        continue;
      }

      const xDistance = Math.abs(column - searchCenterX) / searchCenterX;
      const yDistance = Math.abs(row - searchCenterY) / searchCenterY;
      if (xDistance > 0.55 || yDistance > 0.55) {
        continue;
      }

      aggregatedPixels += 1;
      aggregatedSaturation += saturation[index];
      aggregatedContrast += contrastMap[index];
      if (column < aggregatedMinColumn) {
        aggregatedMinColumn = column;
      }
      if (column > aggregatedMaxColumn) {
        aggregatedMaxColumn = column;
      }
      if (row < aggregatedMinRow) {
        aggregatedMinRow = row;
      }
      if (row > aggregatedMaxRow) {
        aggregatedMaxRow = row;
      }
    }
  }

  if (aggregatedPixels > 0) {
    const aggregatedCandidate = scoreCandidateBounds(
      aggregatedMinColumn,
      aggregatedMaxColumn,
      aggregatedMinRow,
      aggregatedMaxRow,
      aggregatedPixels,
      aggregatedSaturation,
      aggregatedContrast,
      searchCenterX,
      searchCenterY,
      minComponentSpan,
    );

    if (!bestCandidate || aggregatedCandidate.score > bestCandidate.score) {
      bestCandidate = aggregatedCandidate;
    }
  }

  if (!bestCandidate || bestCandidate.score < 0.34) {
    return null;
  }

  const bboxWidth = (bestCandidate.maxColumn - bestCandidate.minColumn + 1) * sampleStep;
  const bboxHeight = (bestCandidate.maxRow - bestCandidate.minRow + 1) * sampleStep;
  const centerX =
    (bestCandidate.minColumn + bestCandidate.maxColumn + 1) * sampleStep * 0.5;
  const centerY =
    (bestCandidate.minRow + bestCandidate.maxRow + 1) * sampleStep * 0.5;
  const expandedSide = Math.max(bboxWidth, bboxHeight) * 1.06;
  const fallbackGuide = computeGuideRect(
    imageData.width,
    imageData.height,
    fallbackGuideScale,
  );
  const minGuideSize = Math.max(
    Math.floor(minDimension * 0.18),
    Math.floor(fallbackGuide.size * 0.55),
  );
  const maxGuideSize = Math.floor(minDimension * 0.82);
  const guideSize = clampNumber(
    Math.round(expandedSide),
    minGuideSize,
    maxGuideSize,
  );

  return {
    guideRect: {
      x: clampNumber(Math.round(centerX - guideSize / 2), 0, imageData.width - guideSize),
      y: clampNumber(Math.round(centerY - guideSize / 2), 0, imageData.height - guideSize),
      size: guideSize,
    },
    confidence: clamp01(bestCandidate.score),
  };
}

function sampleStickerDetection(
  imageData: Pick<ImageData, "width" | "height" | "data">,
  centerX: number,
  centerY: number,
  radius: number,
  cellSize: number,
  isCenterSticker: boolean,
): ColorDetectionResult {
  const { width, height, data } = imageData;
  const weightByColor = createColorAccumulator();
  const confidenceByColor = createColorAccumulator();
  const rgbByColor = createRgbAccumulator();
  const centerProbeOffset = Math.max(2, Math.floor(cellSize * 0.18));
  const probeRadius = isCenterSticker
    ? Math.max(2, Math.floor(Math.min(radius * 0.72, cellSize * 0.11)))
    : radius;
  const probeCenters = isCenterSticker
    ? [
        { x: centerX - centerProbeOffset, y: centerY - centerProbeOffset },
        { x: centerX + centerProbeOffset, y: centerY - centerProbeOffset },
        { x: centerX - centerProbeOffset, y: centerY + centerProbeOffset },
        { x: centerX + centerProbeOffset, y: centerY + centerProbeOffset },
      ]
    : [{ x: centerX, y: centerY }];
  let totalWeight = 0;

  for (const probeCenter of probeCenters) {
    for (let y = probeCenter.y - probeRadius; y <= probeCenter.y + probeRadius; y += 1) {
      if (y < 0 || y >= height) {
        continue;
      }
      for (let x = probeCenter.x - probeRadius; x <= probeCenter.x + probeRadius; x += 1) {
        if (x < 0 || x >= width) {
          continue;
        }
        const dx = x - probeCenter.x;
        const dy = y - probeCenter.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > probeRadius * probeRadius) {
          continue;
        }

        const pixelIndex = (y * width + x) * 4;
        const rgb = {
          r: data[pixelIndex],
          g: data[pixelIndex + 1],
          b: data[pixelIndex + 2],
        };
        const brightness = rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722;
        if (brightness < 22) {
          continue;
        }

        const detection = classifyCubeColor(rgb);
        const distance = Math.sqrt(distanceSquared);
        const radialWeight =
          1.15 - (distance / Math.max(probeRadius, 1)) * 0.45;
        const weight = radialWeight * (0.35 + detection.confidence * 0.65);

        weightByColor[detection.color] += weight;
        confidenceByColor[detection.color] += detection.confidence * weight;
        rgbByColor[detection.color].r += rgb.r * weight;
        rgbByColor[detection.color].g += rgb.g * weight;
        rgbByColor[detection.color].b += rgb.b * weight;
        totalWeight += weight;
      }
    }
  }

  if (totalWeight === 0) {
    return classifyCubeColor({ r: 0, g: 0, b: 0 });
  }

  let winner: Color = "white";
  for (const color of Object.keys(weightByColor) as Color[]) {
    if (weightByColor[color] > weightByColor[winner]) {
      winner = color;
    }
  }

  const winnerWeight = weightByColor[winner];
  const representativeRgb = {
    r: Math.round(rgbByColor[winner].r / winnerWeight),
    g: Math.round(rgbByColor[winner].g / winnerWeight),
    b: Math.round(rgbByColor[winner].b / winnerWeight),
  };

  return {
    color: winner,
    confidence: clamp01(
      (winnerWeight / totalWeight) * 0.72 +
        (confidenceByColor[winner] / winnerWeight) * 0.28,
    ),
    rgb: representativeRgb,
    hsv: rgbToHsv(representativeRgb),
  };
}

function samplePixel(
  imageData: Pick<ImageData, "width" | "height" | "data">,
  x: number,
  y: number,
): RGB {
  const pixelIndex = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[pixelIndex],
    g: imageData.data[pixelIndex + 1],
    b: imageData.data[pixelIndex + 2],
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function clamp01(value: number): number {
  return clampNumber(value, 0, 1);
}

function createColorAccumulator(): Record<Color, number> {
  return {
    white: 0,
    red: 0,
    green: 0,
    yellow: 0,
    orange: 0,
    blue: 0,
  };
}

function createRgbAccumulator(): Record<Color, RGB> {
  return {
    white: { r: 0, g: 0, b: 0 },
    red: { r: 0, g: 0, b: 0 },
    green: { r: 0, g: 0, b: 0 },
    yellow: { r: 0, g: 0, b: 0 },
    orange: { r: 0, g: 0, b: 0 },
    blue: { r: 0, g: 0, b: 0 },
  };
}

interface CandidateBounds {
  minColumn: number;
  maxColumn: number;
  minRow: number;
  maxRow: number;
  score: number;
}

export function isDetectedGuideReliable(
  detectedGuide: GuideRect,
  confidence: number,
  fallbackGuide: GuideRect,
): boolean {
  if (confidence < 0.46) {
    return false;
  }

  const detectedCenterX = detectedGuide.x + detectedGuide.size / 2;
  const detectedCenterY = detectedGuide.y + detectedGuide.size / 2;
  const fallbackCenterX = fallbackGuide.x + fallbackGuide.size / 2;
  const fallbackCenterY = fallbackGuide.y + fallbackGuide.size / 2;
  const centerDistance = Math.hypot(
    detectedCenterX - fallbackCenterX,
    detectedCenterY - fallbackCenterY,
  );
  const normalizedDistance = centerDistance / fallbackGuide.size;
  const sizeRatio = detectedGuide.size / fallbackGuide.size;
  const overlapRatio = computeOverlapRatio(detectedGuide, fallbackGuide);

  return (
    normalizedDistance <= 0.34 &&
    sizeRatio >= 0.48 &&
    sizeRatio <= 1.08 &&
    overlapRatio >= 0.56
  );
}

function computeOverlapRatio(a: GuideRect, b: GuideRect): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.size, b.x + b.size);
  const bottom = Math.min(a.y + a.size, b.y + b.size);

  if (right <= left || bottom <= top) {
    return 0;
  }

  const intersectionArea = (right - left) * (bottom - top);
  const smallerArea = Math.min(a.size * a.size, b.size * b.size);
  return intersectionArea / smallerArea;
}

function scoreCandidateBounds(
  minColumn: number,
  maxColumn: number,
  minRow: number,
  maxRow: number,
  componentPixels: number,
  saturationSum: number,
  contrastSum: number,
  searchCenterX: number,
  searchCenterY: number,
  minComponentSpan: number,
): CandidateBounds {
  const spanColumns = maxColumn - minColumn + 1;
  const spanRows = maxRow - minRow + 1;
  const boxPixels = spanColumns * spanRows;
  const fillRatio = componentPixels / boxPixels;
  const aspectScore = Math.min(spanColumns, spanRows) / Math.max(spanColumns, spanRows);
  const sizeScore = clamp01((Math.min(spanColumns, spanRows) - minComponentSpan) / 18);
  const averageSaturation = saturationSum / componentPixels;
  const averageContrast = contrastSum / componentPixels;
  const centerX = minColumn + spanColumns / 2;
  const centerY = minRow + spanRows / 2;
  const centerDistance = Math.hypot(centerX - searchCenterX, centerY - searchCenterY);
  const maxCenterDistance = Math.hypot(searchCenterX, searchCenterY);
  const centerScore = clamp01(1 - centerDistance / maxCenterDistance);
  const colorStructureScore = clamp01(averageSaturation * 0.7 + averageContrast * 1.2);
  const score =
    aspectScore * 0.24 +
    fillRatio * 0.16 +
    sizeScore * 0.22 +
    centerScore * 0.18 +
    colorStructureScore * 0.2;

  return {
    minColumn,
    maxColumn,
    minRow,
    maxRow,
    score,
  };
}
