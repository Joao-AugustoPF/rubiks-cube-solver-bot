import styles from "./ScannerGuideOverlay.module.css";

export function ScannerGuideOverlay() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.guide}>
        <div className={styles.vertical} />
        <div className={styles.vertical} />
        <div className={styles.horizontal} />
        <div className={styles.horizontal} />
      </div>
    </div>
  );
}
