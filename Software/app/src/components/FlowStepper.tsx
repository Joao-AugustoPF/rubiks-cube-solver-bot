import styles from "./FlowStepper.module.css";

interface FlowStepperProps {
  activeStep: 1 | 2 | 3;
}

const FLOW_STEPS = [
  {
    number: 1,
    title: "Escolher entrada",
    description: "Comece pela câmera ou pelo editor manual. São dois caminhos para o mesmo fluxo.",
  },
  {
    number: 2,
    title: "Mapear e resolver",
    description: "Revise as cores, valide o cubo e gere a sessão de solução.",
  },
  {
    number: 3,
    title: "Assistir em 3D",
    description: "Abra a execução, inicie o mock da máquina e veja cada camada girar.",
  },
] as const;

export function FlowStepper({ activeStep }: FlowStepperProps) {
  return (
    <section className={styles.flow} aria-label="Fluxo principal do resolvedor">
      <div className={styles.heading}>
        <strong>Fluxo linear</strong>
        <span>Siga uma etapa por vez.</span>
      </div>

      <div className={styles.steps}>
        {FLOW_STEPS.map((step) => (
          <article
            key={step.number}
            className={`${styles.step} ${
              activeStep === step.number ? styles.stepActive : ""
            }`}
            aria-current={activeStep === step.number ? "step" : undefined}
          >
            <span className={styles.stepNumber}>{step.number}</span>
            <div className={styles.stepCopy}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
