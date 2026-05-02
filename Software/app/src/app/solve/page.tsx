import { SolveSessionRunner } from "@/components/solve/SolveSessionRunner";
import Link from "next/link";
import styles from "./SolvePage.module.css";

export default function SolvePage() {
  return (
    <main id="main-content" className={`page-shell ${styles.executionPage}`}>
      <section className={styles.commandHeader} aria-labelledby="execution-title">
        <div className={styles.titleBlock}>
          <span className={styles.stageLabel}>Etapa 3 · Execução</span>
          <h1 id="execution-title">Console de execução</h1>
          <p>
            Sessão, máquina mock, controles e cubo 3D ficam no mesmo painel para
            acompanhar a solução em tempo real.
          </p>
        </div>
        <div className={styles.headerActions} aria-label="Criar nova sessão">
          <Link href="/scan">Scanner</Link>
          <Link href="/manual">Manual</Link>
        </div>
      </section>

      <SolveSessionRunner />
    </main>
  );
}
