import Link from "next/link";
import { FACE_CONVENTION_DESCRIPTION, FACE_ROTATION_RULE } from "@/lib/cube/convention";
import styles from "./AppShell.module.css";

const QUICK_START_STEPS = [
  {
    title: "Escaneie ou monte o cubo",
    description:
      "Use a câmera para capturar as 6 faces ou monte um estado manualmente para testes.",
  },
  {
    title: "Valide e resolva",
    description:
      "O backend verifica a consistência do cubo e gera a sequência de movimentos lógicos.",
  },
  {
    title: "Execute e acompanhe",
    description:
      "A máquina mock dispara a animação, e o fluxo fica pronto para a troca futura pelo ESP32.",
  },
] as const;

const SCENARIOS = [
  {
    href: "/scan",
    label: "Quero usar a câmera",
    title: "Scanner guiado",
    description:
      "Fluxo passo a passo para capturar, revisar e resolver sem depender de montagem manual.",
  },
  {
    href: "/manual",
    label: "Quero testar um caso específico",
    title: "Editor manual",
    description:
      "Pinte os stickers, valide a contagem das cores e gere a solução para qualquer estado.",
  },
  {
    href: "/solve",
    label: "Quero demonstrar o produto",
    title: "Execução completa",
    description:
      "Veja a sessão gerada, status da máquina mock, animação e plano mecânico no mesmo lugar.",
  },
  {
    href: "/architecture",
    label: "Quero entender o código",
    title: "Arquitetura explicada",
    description:
      "Mapa visual das camadas do sistema, contratos, fluxo ponta a ponta e integração futura.",
  },
] as const;

const SYSTEM_BLOCKS = [
  {
    title: "Domínio do cubo",
    tag: "core",
    description:
      "Modelagem, validação, movimentos e solver ficam separados da interface para manter previsibilidade.",
  },
  {
    title: "Experiência de uso",
    tag: "ui",
    description:
      "Scanner, editor manual, execução e onboarding técnico ficam dentro do mesmo app Next.js.",
  },
  {
    title: "Camada de máquina",
    tag: "mock",
    description:
      "Planner mecânico, contratos tipados e mock simulam a integração futura com o ESP32.",
  },
  {
    title: "Demonstração completa",
    tag: "demo",
    description:
      "O produto já percorre captura, validação, solução, animação e execução mock de ponta a ponta.",
  },
] as const;

const PROJECT_STATUS = [
  { label: "Scanner", value: "pronto" },
  { label: "Solver", value: "pronto" },
  { label: "Animação", value: "pronto" },
  { label: "Planner mecânico", value: "pronto" },
  { label: "ESP32 real", value: "próximo passo" },
] as const;

export function AppShell() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Rubik&apos;s Cube Resolver Bot</span>
        <div className="heroGrid">
          <div className={styles.heroCopy}>
            <h1>Entenda o sistema em segundos e execute o fluxo sem se perder.</h1>
            <p className="leadText">
              Este projeto junta scanner, validação, solver, animação e integração
              mock com máquina física em uma experiência única. A home agora
              responde três perguntas diretas: o que existe, por onde começar e o
              que cada página faz.
            </p>
            <div className="actionRow">
              <Link href="/scan">Começar pelo scanner</Link>
              <Link href="/manual">Montar um cubo manualmente</Link>
              <Link href="/solve">Abrir execução</Link>
            </div>
            <div className={styles.statusRow}>
              {PROJECT_STATUS.map((item) => (
                <span
                  key={item.label}
                  className={`${styles.statusPill} ${
                    item.value === "pronto" ? styles.statusReady : styles.statusNext
                  }`}
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>

          <aside className="heroAside">
            <h3>Fluxo principal</h3>
            <div className="miniSteps">
              {QUICK_START_STEPS.map((step, index) => (
                <div key={step.title} className="miniStep">
                  <span className="miniStepNumber">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </header>

      <section className="sectionCard">
        <div className="sectionCardHeader">
          <span className="sectionLabel">Comece daqui</span>
          <h2>Escolha pelo objetivo, não pela estrutura do código</h2>
          <p>
            Cada entrada abaixo foi escrita como caminho de uso, para que a pessoa
            entenda rapidamente onde clicar e o que vai acontecer.
          </p>
        </div>

        <div className={styles.scenarioGrid}>
          {SCENARIOS.map((scenario) => (
            <Link key={scenario.href} href={scenario.href} className={styles.scenarioCard}>
              <span className={styles.scenarioLabel}>{scenario.label}</span>
              <h3>{scenario.title}</h3>
              <p>{scenario.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionCardHeader">
          <span className="sectionLabel">Mapa rápido</span>
          <h2>O que cada parte do produto faz</h2>
        </div>

        <div className="infoGrid">
          {SYSTEM_BLOCKS.map((block) => (
            <article key={block.title} className="infoCard">
              <span className="tag">{block.tag}</span>
              <h3>{block.title}</h3>
              <p>{block.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionCardHeader">
          <span className="sectionLabel">Legenda do cubo</span>
          <h2>Convenção URFDLB sem enrolação</h2>
          <p>
            Se alguém olhar para o sistema e não souber o que é `U`, `R` ou `F`,
            aqui está a tradução direta.
          </p>
        </div>

        <div className={styles.faceGrid}>
          {Object.entries(FACE_CONVENTION_DESCRIPTION).map(([face, label]) => (
            <article key={face} className={styles.faceCard}>
              <strong>{face}</strong>
              <p>{label}</p>
            </article>
          ))}
        </div>

        <div className="mutedCard">{FACE_ROTATION_RULE}</div>
      </section>
    </main>
  );
}
