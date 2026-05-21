import { type Color, type Face, type FaceStickers } from "@/types";
import styles from "./FaceStickerGrid.module.css";

interface FaceStickerGridProps {
  face: Face;
  stickers: FaceStickers;
  editable?: boolean;
  activeColor?: Color;
  onChangeSticker?: (index: number, color: Color) => void;
}

const STICKER_COLOR_HEX: Record<Color, string> = {
  white: "#f8fafc",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  blue: "#3b82f6",
};

export function FaceStickerGrid({
  face,
  stickers,
  editable = false,
  activeColor,
  onChangeSticker,
}: FaceStickerGridProps) {
  return (
    <div className={styles.card}>
      <header>
        <strong>{face}</strong>
      </header>

      <div className={styles.grid}>
        {stickers.map((sticker, index) => {
          const isEditable = editable && onChangeSticker && activeColor;
          const commonProps = {
            className: `${styles.sticker} ${index === 4 ? styles.centerSticker : ""}`,
            style: { backgroundColor: STICKER_COLOR_HEX[sticker] },
          };

          if (!isEditable) {
            return <div key={`${face}-${index}`} {...commonProps} />;
          }

          return (
            <button
              key={`${face}-${index}`}
              type="button"
              {...commonProps}
              onClick={() => onChangeSticker(index, activeColor)}
              aria-label={`Face ${face}, posição ${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
