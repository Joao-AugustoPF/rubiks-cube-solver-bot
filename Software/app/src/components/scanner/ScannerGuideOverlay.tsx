import type { GuideRect } from "@/lib/scanner";
import { projectGuideRectToViewport } from "@/lib/scanner/guide-projection";
import styles from "./ScannerGuideOverlay.module.css";

interface ScannerGuideOverlayProps {
  guideRect?: GuideRect | null;
  frameWidth?: number;
  frameHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  detected?: boolean;
}

export function ScannerGuideOverlay({
  guideRect,
  frameWidth,
  frameHeight,
  viewportWidth,
  viewportHeight,
  detected = false,
}: ScannerGuideOverlayProps) {
  const dynamicStyle =
    guideRect &&
    frameWidth &&
    frameHeight &&
    viewportWidth &&
    viewportHeight
      ? (() => {
          const projectedGuide = projectGuideRectToViewport(
            guideRect,
            frameWidth,
            frameHeight,
            viewportWidth,
            viewportHeight,
          );

          return {
            left: `${projectedGuide.left}px`,
            top: `${projectedGuide.top}px`,
            width: `${projectedGuide.width}px`,
            height: `${projectedGuide.height}px`,
          };
        })()
      : undefined;

  return (
    <div className={styles.overlay} aria-hidden="true">
      <div
        className={`${styles.guide} ${
          detected ? styles.guideDetected : styles.guideSearching
        }`}
        style={dynamicStyle}
      >
        <div className={styles.vertical} />
        <div className={styles.vertical} />
        <div className={styles.horizontal} />
        <div className={styles.horizontal} />
      </div>
    </div>
  );
}
