import Link from "next/link";
import {
  FirmwareModuleCards,
  type FirmwareModuleDefinition,
} from "./FirmwareModuleCards";
import { MachineStateGrid, type MachineStateDefinition } from "./MachineStateGrid";
import styles from "./Esp32FirmwareGuide.module.css";

const SECTION_ITEMS = [
  { id: "overview", label: "Visão Geral" },
  { id: "architecture-role", label: "Papel no Sistema" },
  { id: "firmware-structure", label: "Estrutura Modular" },
  { id: "internal-flow", label: "Fluxo Interno" },
  { id: "machine-states", label: "Estados da Máquina" },
  { id: "integration-contract", label: "Contrato" },
  { id: "main-modules", label: "Módulos Detalhados" },
  { id: "code-organization", label: "Organização de Código" },
  { id: "mechanical-actions", label: "Ações Mecânicas" },
  { id: "safety", label: "Segurança" },
  { id: "non-goals", label: "Não Deve Fazer" },
  { id: "implementation-order", label: "Ordem de Implementação" },
  { id: "final-integration", label: "Integração Final" },
] as const;

const FIRMWARE_MODULES: readonly FirmwareModuleDefinition[] = [
  {
    id: "comm",
    name: "comm",
    role: "Recebe comandos, parseia payload e publica status.",
    why: "Isola protocolo de comunicação do controle físico.",
  },
  {
    id: "executor",
    name: "plan_executor",
    role: "Executa a lista de ações em ordem e controla índice atual.",
    why: "Mantém execução determinística e auditável por job.",
  },
  {
    id: "motor",
    name: "motor_controller",
    role: "Abstrai direção, velocidade, aceleração e precisão de motores.",
    why: "Evita espalhar detalhes de driver por todo firmware.",
  },
  {
    id: "clamp",
    name: "clamp_controller",
    role: "Abre/fecha garras com sequência segura.",
    why: "Garante fixação estável do cubo antes de girar eixos.",
  },
  {
    id: "homing",
    name: "homing_controller",
    role: "Leva eixos à referência conhecida no boot e quando necessário.",
    why: "Sem homing, o estado mecânico fica ambíguo.",
  },
  {
    id: "safety",
    name: "safety_controller",
    role: "Timeout, falha de sensor, inconsistência e parada segura.",
    why: "Protege máquina, usuário e cubo contra erro de execução.",
  },
  {
    id: "state",
    name: "machine_state",
    role: "Estado global da máquina e transições permitidas.",
    why: "Facilita debug, telemetria e integração com o backend.",
  },
  {
    id: "config",
    name: "config",
    role: "Pinos, limites, perfis de velocidade e parâmetros físicos.",
    why: "Centraliza calibração sem alterar regras de negócio.",
  },
] as const;

const MACHINE_STATES: readonly MachineStateDefinition[] = [
  { name: "idle", description: "Firmware ligado, sem plano carregado." },
  { name: "homing", description: "Ajustando referência mecânica inicial." },
  { name: "ready", description: "Pronto para receber e validar plano." },
  { name: "queued", description: "Plano aceito, aguardando início de execução." },
  { name: "started", description: "Execução iniciada; frontend pode disparar animação." },
  { name: "executing", description: "Ações sendo executadas em sequência." },
  { name: "finished", description: "Plano finalizado com sucesso." },
  { name: "error", description: "Falha detectada; exige tratamento e recuperação." },
] as const;

const INTERNAL_FLOW = [
  "Boot do ESP32",
  "Load de config + init de drivers",
  "Homing inicial",
  "Estado ready",
  "Recebe mechanicalPlan",
  "Valida estrutura + entra em queued",
  "Publica started",
  "Executa ação por ação",
  "Publica finished ou error",
] as const;

const RESPONSIBILITY_SPLIT = [
  {
    layer: "Website / Frontend",
    does: "Scanner guiado, revisão manual, visualização e animação.",
    doesnt: "Não controla hardware diretamente.",
  },
  {
    layer: "Backend / Solver / Planner",
    does: "Valida CubeState, gera logicalMoves e mechanicalPlan.",
    doesnt: "Não pilota motores em tempo real.",
  },
  {
    layer: "Firmware ESP32",
    does: "Executa mechanicalPlan com segurança e precisão mecânica.",
    doesnt: "Não resolve cubo, não faz scanner, não recalcula solução.",
  },
] as const;

const IMPLEMENTATION_ORDER = [
  "Comunicação básica (receber plano + enviar status).",
  "Machine state e transições permitidas.",
  "Homing inicial confiável.",
  "Controle de 1 motor com perfil de movimento.",
  "Execução de ações simples (`home`, `wait`, `clamp`).",
  "Integração de ações completas (`turn_face`, `rotate_cube`) e safety.",
] as const;

export function Esp32FirmwareGuide() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Firmware Architecture Onboarding</p>
        <h1>Como estruturar o firmware ESP32 deste projeto</h1>
        <p>
          Esta página explica, de forma visual e prática, como organizar o código
          embarcado para executar o plano mecânico vindo do sistema web.
        </p>
        <div className={styles.heroLinks}>
          <Link href="/architecture">Arquitetura do sistema web</Link>
          <Link href="/solve">Execução no frontend</Link>
          <Link href="/manual">Fluxo manual</Link>
          <Link href="/scan">Fluxo scanner</Link>
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="Navegação da apresentação">
        {SECTION_ITEMS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <section id="overview" className={styles.section}>
        <h2>1. Visão geral da função do ESP32</h2>
        <div className={styles.twoColumn}>
          <article className={styles.highlightCard}>
            <h3>O ESP32 faz</h3>
            <ul>
              <li>Recebe o `mechanicalPlan` já pronto.</li>
              <li>Executa ações físicas com precisão.</li>
              <li>Publica status (`queued`, `started`, `finished`, `error`).</li>
              <li>Aplica segurança (homing, timeout, parada segura).</li>
            </ul>
          </article>
          <article className={styles.warningCard}>
            <h3>O ESP32 não faz</h3>
            <ul>
              <li>Não faz scanner de câmera.</li>
              <li>Não resolve o cubo logicamente.</li>
              <li>Não recalcula sequência de solução.</li>
              <li>Não deve acoplar regras de UI.</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="architecture-role" className={styles.section}>
        <h2>2. Papel do ESP32 na arquitetura geral</h2>
        <div className={styles.flowBand}>
          <span>Website / Backend</span>
          <span>MechanicalPlan</span>
          <span>ESP32</span>
          <span>Motores + Sensores</span>
        </div>
        <div className={styles.responsibilityGrid}>
          {RESPONSIBILITY_SPLIT.map((item) => (
            <article key={item.layer} className={styles.responsibilityCard}>
              <h3>{item.layer}</h3>
              <p>
                <strong>Responsável por:</strong> {item.does}
              </p>
              <p>
                <strong>Não deve fazer:</strong> {item.doesnt}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="firmware-structure" className={styles.section}>
        <h2>3. Estrutura recomendada do firmware</h2>
        <p>
          A separação por módulos evita acoplamento entre comunicação, execução,
          controle físico e segurança.
        </p>
        <FirmwareModuleCards modules={FIRMWARE_MODULES} />
      </section>

      <section id="internal-flow" className={styles.section}>
        <h2>4. Fluxo interno do firmware</h2>
        <div className={styles.timeline}>
          {INTERNAL_FLOW.map((step, index) => (
            <article key={step} className={styles.timelineItem}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="machine-states" className={styles.section}>
        <h2>5. Estados da máquina</h2>
        <p>
          Estado explícito aumenta previsibilidade operacional, facilita debug e
          define transições seguras.
        </p>
        <MachineStateGrid states={MACHINE_STATES} />
      </section>

      <section id="integration-contract" className={styles.section}>
        <h2>6. Contrato de integração</h2>
        <div className={styles.contractGrid}>
          <article>
            <h3>Plano recebido pelo ESP32</h3>
            <pre>
              <code>{`{
  "jobId": "cube-001",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "clamp", "name": "A", "state": "close" },
    { "type": "rotate_cube", "axis": "x", "degrees": 90 },
    { "type": "turn_face", "actuator": "right", "degrees": 90 },
    { "type": "wait", "durationMs": 120 }
  ]
}`}</code>
            </pre>
          </article>
          <article>
            <h3>Status devolvido pelo ESP32</h3>
            <pre>
              <code>{`{
  "jobId": "cube-001",
  "status": "started",
  "updatedAt": "2026-04-08T18:00:00.000Z"
}`}</code>
            </pre>
            <p>
              O frontend já está preparado para iniciar animação ao receber{" "}
              <code>started</code>. Também espera <code>finished</code> e{" "}
              <code>error</code>.
            </p>
          </article>
        </div>
      </section>

      <section id="main-modules" className={styles.section}>
        <h2>7. Módulos principais do firmware</h2>
        <div className={styles.accordionList}>
          {FIRMWARE_MODULES.map((module, index) => (
            <details key={module.id} open={index === 0}>
              <summary>
                {index + 1}. {module.name}
              </summary>
              <p>{module.role}</p>
              <p>{module.why}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="code-organization" className={styles.section}>
        <h2>8. Organização sugerida de código</h2>
        <div className={styles.codeOrgGrid}>
          <article className={styles.treeCard}>
            <h3>Árvore de diretórios</h3>
            <pre>
              <code>{`firmware/
  src/
    main.cpp
    comm/
      comm_manager.cpp
    executor/
      plan_executor.cpp
    motors/
      motor_controller.cpp
    clamps/
      clamp_controller.cpp
    homing/
      homing_controller.cpp
    safety/
      safety_controller.cpp
    state/
      machine_state.cpp
    config/
      machine_config.h`}</code>
            </pre>
          </article>
          <article className={styles.treeCard}>
            <h3>Regra prática</h3>
            <ul>
              <li>`main.cpp` orquestra boot e loop principal.</li>
              <li>Cada pasta expõe API clara e pequena.</li>
              <li>Estado global centralizado em `machine_state`.</li>
              <li>Parâmetros físicos isolados em `config`.</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="mechanical-actions" className={styles.section}>
        <h2>9. Ações mecânicas que o firmware deve entender</h2>
        <div className={styles.actionsGrid}>
          <article>
            <h3>Tipos de ação</h3>
            <ul>
              <li>`home`</li>
              <li>`clamp`</li>
              <li>`rotate_cube`</li>
              <li>`turn_face`</li>
              <li>`wait`</li>
            </ul>
          </article>
          <article>
            <h3>Modelagem sugerida (firmware)</h3>
            <pre>
              <code>{`enum class ActionType {
  Home,
  Clamp,
  RotateCube,
  TurnFace,
  Wait
};

struct MechanicalAction {
  ActionType type;
  // campos específicos por tipo
};`}</code>
            </pre>
          </article>
        </div>
        <div className={styles.comparisonBand}>
          <article>
            <h3>logicalMoves (backend)</h3>
            <p>Representação lógica de solução do cubo.</p>
            <code>["R", "U", "R'", "U'", "F2"]</code>
          </article>
          <article>
            <h3>mechanicalPlan (firmware)</h3>
            <p>Ações físicas executáveis por atuadores.</p>
            <code>turn_face / clamp / home / wait</code>
          </article>
        </div>
      </section>

      <section id="safety" className={styles.section}>
        <h2>10. Segurança e confiabilidade</h2>
        <div className={styles.safetyGrid}>
          <article>Homing obrigatório antes de execução.</article>
          <article>Timeout por ação e timeout global por job.</article>
          <article>Validação de plano antes de entrar em `queued`.</article>
          <article>Botão de emergência / parada segura.</article>
          <article>Fallback para estado `error` com diagnóstico.</article>
          <article>Logs e status para depuração remota.</article>
        </div>
      </section>

      <section id="non-goals" className={styles.section}>
        <h2>11. O que o firmware não deve fazer</h2>
        <div className={styles.nonGoalsGrid}>
          <article>Não resolver o cubo.</article>
          <article>Não interpretar scanner/câmera.</article>
          <article>Não recalcular movimentos lógicos.</article>
          <article>Não depender da UI a cada passo mecânico.</article>
          <article>Não misturar lógica de cubo com controle físico.</article>
        </div>
      </section>

      <section id="implementation-order" className={styles.section}>
        <h2>12. Resumo prático para implementar</h2>
        <ol className={styles.implementationOrder}>
          {IMPLEMENTATION_ORDER.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section id="final-integration" className={styles.section}>
        <h2>13. Integração final com o projeto web</h2>
        <div className={styles.finalGrid}>
          <article>
            <h3>O que precisa bater entre os dois lados</h3>
            <ul>
              <li>Mesmos tipos de ação (`home`, `clamp`, `turn_face`, etc.).</li>
              <li>Mesmo contrato de status (`queued`, `started`, `finished`, `error`).</li>
              <li>`jobId` preservado em todo o ciclo.</li>
              <li>Semântica de erro consistente para troubleshooting.</li>
            </ul>
          </article>
          <article>
            <h3>Comparações essenciais</h3>
            <ul>
              <li>Backend decide a lógica; firmware executa física.</li>
              <li>Estado lógico do cubo ≠ posição física de atuadores.</li>
              <li>Website orienta fluxo; ESP32 garante segurança operacional.</li>
              <li>Frontend anima por `logicalMoves`; máquina executa `mechanicalPlan`.</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
