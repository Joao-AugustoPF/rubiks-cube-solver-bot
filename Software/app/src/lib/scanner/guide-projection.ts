import type { GuideRect } from "./reader";

export interface ViewportGuideRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function projectGuideRectToViewport(
  guideRect: GuideRect,
  frameWidth: number,
  frameHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): ViewportGuideRect {
  const scale = Math.max(viewportWidth / frameWidth, viewportHeight / frameHeight);
  const renderedWidth = frameWidth * scale;
  const renderedHeight = frameHeight * scale;
  const offsetX = (viewportWidth - renderedWidth) / 2;
  const offsetY = (viewportHeight - renderedHeight) / 2;

  return {
    left: offsetX + guideRect.x * scale,
    top: offsetY + guideRect.y * scale,
    width: guideRect.size * scale,
    height: guideRect.size * scale,
  };
}
