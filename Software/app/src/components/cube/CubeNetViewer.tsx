import { FACE_ORDER, type Color, type CubeState, type Face } from "@/types";
import styles from "./CubeNetViewer.module.css";

interface CubeNetViewerProps {
  cubeState: CubeState;
  title?: string;
  subtitle?: string;
}

const FACE_GRID_AREA: Record<Face, string> = {
  U: "u",
  L: "l",
  F: "f",
  R: "r",
  B: "b",
  D: "d",
};

const FACE_NAME: Record<Face, string> = {
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

const STICKER_COLOR_HEX: Record<Color, string> = {
  white: "#f8fafc",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  blue: "#3b82f6",
};

export function CubeNetViewer({ cubeState, title, subtitle }: CubeNetViewerProps) {
  return (
    <section className={styles.viewer}>
      {title ? <h3>{title}</h3> : null}
      {subtitle ? <p>{subtitle}</p> : null}

      <div className={styles.net}>
        {FACE_ORDER.map((face) => (
          <div
            key={face}
            className={styles.faceCard}
            style={{ gridArea: FACE_GRID_AREA[face] }}
          >
            <header>
              <strong>{face}</strong>
              <span>{FACE_NAME[face]}</span>
            </header>

            <div className={styles.faceGrid}>
              {cubeState[face].map((stickerColor, index) => (
                <div
                  key={`${face}-${index}`}
                  className={`${styles.sticker} ${
                    index === 4 ? styles.centerSticker : ""
                  }`}
                  style={{ backgroundColor: STICKER_COLOR_HEX[stickerColor] }}
                  aria-label={`Face ${face}, posição ${index}, cor ${stickerColor}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
