"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FACE_ORDER, type Face } from "@/types";
import { FACE_GUIDE_NAME, getFaceGuidePose } from "@/lib/scanner/face-guide";
import styles from "./ScannerFaceGuide3D.module.css";

interface ScannerFaceGuide3DProps {
  face: Face;
}

const FACE_COLOR_HEX: Record<Face, string> = {
  U: "#f8fafc",
  R: "#ef4444",
  F: "#22c55e",
  D: "#facc15",
  L: "#f97316",
  B: "#3b82f6",
};

export function ScannerFaceGuide3D({ face }: ScannerFaceGuide3DProps) {
  const [displayedFace, setDisplayedFace] = useState<Face>("F");

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setDisplayedFace(face);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [face]);

  const pose = getFaceGuidePose(displayedFace);
  const poseStyle = {
    "--guide-rotate-x": `${pose.rotateX}deg`,
    "--guide-rotate-y": `${pose.rotateY}deg`,
  } as CSSProperties;

  return (
    <section className={styles.card} aria-labelledby="scanner-face-guide-title">
      <div className={styles.header}>
        <span className={styles.tag}>guia 3d</span>
        <h3 id="scanner-face-guide-title">Qual face mostrar agora</h3>
        <p>
          O cubo começa pela frente e gira automaticamente até a face <strong>{face}</strong>.
        </p>
      </div>

      <div className={styles.scene}>
        <div className={styles.pose} style={poseStyle}>
          <div className={styles.idle}>
            {FACE_ORDER.map((cubeFace) => (
              <div
                key={cubeFace}
                className={`${styles.face} ${styles[`face${cubeFace}`]} ${
                  face === cubeFace ? styles.targetFace : ""
                }`}
                style={{ "--sticker-color": FACE_COLOR_HEX[cubeFace] } as CSSProperties}
                aria-hidden="true"
              >
                <div className={styles.stickerGrid}>
                  {Array.from({ length: 9 }, (_, index) => (
                    <span
                      key={`${cubeFace}-${index}`}
                      className={`${styles.sticker} ${index === 4 ? styles.centerSticker : ""}`}
                    />
                  ))}
                </div>
                <div className={styles.faceLabel}>
                  <strong>{cubeFace}</strong>
                  <span>{FACE_GUIDE_NAME[cubeFace]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.pathChip}>Partida: frente</span>
        <span className={styles.pathArrow} aria-hidden="true">
          →
        </span>
        <span className={styles.targetChip}>
          Agora: {face} · {FACE_GUIDE_NAME[face]}
        </span>
      </div>
    </section>
  );
}
