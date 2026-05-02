import Link from "next/link";
import { FlowStepper } from "./FlowStepper";
import styles from "./AppShell.module.css";

export function AppShell() {
  return (
    <main id="main-content" className="page-shell">
      <section className={styles.flowIntro} aria-labelledby="flow-title">
        <span className="eyebrow">Fluxo guiado</span>
        <h1 id="flow-title">Resolva o cubo seguindo uma etapa por vez.</h1>
        <p className="leadText">
          Comece informando o estado do cubo. Depois o app valida, resolve e
          abre a execução 3D automaticamente.
        </p>
      </section>

      <FlowStepper activeStep={1} />

      <section className={styles.currentStep} aria-labelledby="entry-title">
        <div className={styles.stepBadge}>
          <span>1</span>
          <strong>Etapa atual</strong>
        </div>
        <div className={styles.currentStepCopy}>
          <h2 id="entry-title">Escolha como mapear o cubo</h2>
          <p>
            O scanner é o caminho principal. O editor manual fica como
            alternativa quando não há câmera ou quando você quer testar com um
            estado aleatório.
          </p>
        </div>
        <div className={styles.entryActions} aria-label="Escolha de entrada">
          <Link href="/scan" className={styles.primaryChoice}>
            Usar scanner
          </Link>
          <Link href="/manual" className={styles.secondaryChoice}>
            Montar manualmente
          </Link>
        </div>
        <p className={styles.nextHint}>
          Depois desta escolha, a tela seguinte leva para resolver e assistir a
          animação 3D.
        </p>
      </section>

      <details className={styles.technicalStrip}>
        <summary>Referências técnicas</summary>
        <p>Arquitetura e firmware não fazem parte do fluxo normal do usuário.</p>
        <div className={styles.technicalActions}>
          <Link href="/architecture">Arquitetura</Link>
          <Link href="/esp32-architecture">Firmware ESP32</Link>
        </div>
      </details>

    </main>
  );
}
