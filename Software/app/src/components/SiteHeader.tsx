import Link from "next/link";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className={styles.brandText}>
            <strong>Rubik&apos;s Resolver</strong>
            <small>mapear, resolver, assistir</small>
          </span>
        </Link>

        <div className={styles.flowCue} aria-label="Fluxo guiado">
          <span>1 Entrada</span>
          <span aria-hidden="true">→</span>
          <span>2 Resolver</span>
          <span aria-hidden="true">→</span>
          <span>3 Execução 3D</span>
        </div>
      </div>
    </header>
  );
}
