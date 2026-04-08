import Link from "next/link";
import { FolderTree, type FolderNode } from "./FolderTree";
import { TypeTabs, type TypeTab } from "./TypeTabs";
import styles from "./ArchitectureGuide.module.css";

const SECTION_ITEMS = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "arquitetura", label: "Arquitetura" },
  { id: "pastas", label: "Pastas" },
  { id: "dominio-cubo", label: "Domínio do Cubo" },
  { id: "scanner", label: "Scanner" },
  { id: "validacao-solver", label: "Validação + Solver" },
  { id: "animacao", label: "Animação" },
  { id: "planner", label: "Planner Mecânico" },
  { id: "integracao-maquina", label: "Integração da Máquina" },
  { id: "fluxo", label: "Fluxo Ponta a Ponta" },
  { id: "decisoes", label: "Decisões de Arquitetura" },
  { id: "resumo", label: "Resumo Final" },
] as const;

const FLOW_STEPS = [
  "Scanner",
  "Validação",
  "Solver",
  "Animação",
  "Planner Mecânico",
  "ESP32 (futuro)",
] as const;

const LAYER_ITEMS = [
  {
    name: "UI e Experiência",
    description:
      "Páginas App Router e componentes para scanner, edição manual, execução e onboarding técnico.",
    files: "src/app + src/components",
  },
  {
    name: "Domínio do Cubo",
    description:
      "Modelagem do estado, validação semântica, aplicação de movimentos e serialização para solver.",
    files: "src/lib/cube",
  },
  {
    name: "Camada de Execução",
    description:
      "Sessão consolidada de execução e player de animação baseado em logicalMoves.",
    files: "src/lib/solve-session + src/hooks",
  },
  {
    name: "Camada de Máquina",
    description:
      "Planejamento mecânico abstrato, contratos tipados e gateway mock para troca futura pelo ESP32.",
    files: "src/lib/machine + src/types/machine.ts",
  },
  {
    name: "Backend no mesmo app",
    description:
      "API routes Next.js para validate, solve, machine start e machine status.",
    files: "src/app/api",
  },
] as const;

const FOLDER_TREE: FolderNode[] = [
  {
    name: "src",
    kind: "dir",
    children: [
      {
        name: "app",
        kind: "dir",
        note: "Páginas e API routes",
        children: [
          { name: "page.tsx", kind: "file", note: "Home e navegação principal" },
          { name: "scan/page.tsx", kind: "file", note: "Fluxo de scanner" },
          { name: "manual/page.tsx", kind: "file", note: "Montagem manual" },
          { name: "solve/page.tsx", kind: "file", note: "Execução completa" },
          { name: "architecture/page.tsx", kind: "file", note: "Apresentação técnica" },
          { name: "api/", kind: "dir", note: "Endpoints internos" },
        ],
      },
      {
        name: "components",
        kind: "dir",
        note: "UI por contexto de uso",
        children: [
          { name: "scanner/", kind: "dir", note: "Captura guiada e revisão" },
          { name: "solve/", kind: "dir", note: "Player e sessão de execução" },
          { name: "cube/", kind: "dir", note: "Viewer 2D do cubo" },
        ],
      },
      {
        name: "lib",
        kind: "dir",
        note: "Lógica de domínio e integração",
        children: [
          { name: "cube/", kind: "dir", note: "Domínio do cubo" },
          { name: "scanner/", kind: "dir", note: "Leitura de cor da câmera" },
          { name: "solve-session/", kind: "dir", note: "Sessão consolidada de execução" },
          { name: "machine/", kind: "dir", note: "Planner, contratos e mock" },
        ],
      },
      {
        name: "types",
        kind: "dir",
        note: "Contratos TypeScript compartilhados",
      },
    ],
  },
  { name: "docs", kind: "dir", note: "Documentação técnica consolidada" },
];

const TYPE_TABS: TypeTab[] = [
  {
    id: "cube-state",
    title: "CubeState",
    summary:
      "CubeState representa o cubo completo com 6 faces. Cada face tem exatamente 9 stickers.",
    code: `type Face = "U" | "R" | "F" | "D" | "L" | "B";
type Color = "white" | "red" | "green" | "yellow" | "orange" | "blue";
type FaceStickers = [Color, Color, Color, Color, Color, Color, Color, Color, Color];
type CubeState = Record<Face, FaceStickers>;`,
  },
  {
    id: "logical-move",
    title: "LogicalMove",
    summary:
      "LogicalMove descreve o movimento de solução no nível lógico do cubo, independente da máquina física.",
    code: `type MoveSuffix = "" | "'" | "2";
type LogicalMove = \`\${Face}\${MoveSuffix}\`;

// Exemplos
const moves: LogicalMove[] = ["R", "U", "R'", "U'", "F2"];`,
  },
  {
    id: "mechanical-plan",
    title: "MechanicalPlan",
    summary:
      "MechanicalPlan traduz a solução lógica para ações executáveis pela camada mecânica.",
    code: `interface MechanicalPlan {
  jobId: string;
  actions: MechanicalAction[];
}

type MachineStatus = "queued" | "started" | "finished" | "error";`,
  },
];

const ENDPOINTS = [
  { method: "GET", path: "/api/health", purpose: "status geral da aplicação" },
  { method: "POST", path: "/api/cube/validate", purpose: "validar CubeState" },
  { method: "POST", path: "/api/cube/solve", purpose: "gerar logicalMoves" },
  { method: "POST", path: "/api/machine/start", purpose: "iniciar máquina mock" },
  { method: "GET", path: "/api/machine/status", purpose: "consultar status da execução" },
] as const;

const START_GUIDE = [
  {
    title: "Se você quer usar o produto",
    description:
      "Comece em Scanner ou Manual. Depois siga para Execução para ver máquina mock e animação.",
  },
  {
    title: "Se você quer entender o código",
    description:
      "Leia nesta ordem: Visão Geral, Arquitetura, Pastas, Domínio do Cubo e Integração da Máquina.",
  },
  {
    title: "Se você quer saber o que falta",
    description:
      "O backend, o planner e o mock já estão prontos. O próximo passo é trocar o mock pelo firmware real do ESP32.",
  },
] as const;

export function ArchitectureGuide() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Apresentação Técnica Interativa</p>
        <h1>Arquitetura do Rubik&apos;s Cube Resolver Bot</h1>
        <p>
          Guia visual para onboarding: organização do código, fluxo ponta a ponta,
          contratos de integração e decisões de arquitetura já aplicadas no projeto.
        </p>
        <div className={styles.quickLinks}>
          <Link href="/scan">Scanner</Link>
          <Link href="/manual">Montagem Manual</Link>
          <Link href="/solve">Execução Completa</Link>
          <Link href="/esp32-architecture">Guia ESP32</Link>
          <Link href="/">Home</Link>
        </div>
      </header>

      <section className={styles.startSection}>
        <div className={styles.startHeader}>
          <h2>Comece por aqui</h2>
          <p>
            Esta página ficou organizada para onboarding. Antes de mergulhar nos
            detalhes, use estes três blocos para saber por onde ler.
          </p>
        </div>
        <div className={styles.startGrid}>
          {START_GUIDE.map((item) => (
            <article key={item.title} className={styles.startCard}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <nav className={styles.sectionNav} aria-label="Navegação da apresentação">
        {SECTION_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
      </nav>

      <section id="visao-geral" className={styles.section}>
        <h2>1. Visão Geral do Projeto</h2>
        <p>
          O sistema lê um cubo 3x3 por câmera, valida o estado, calcula a solução
          lógica, anima a resolução e já prepara o plano mecânico para integração
          futura com ESP32.
        </p>
        <div className={styles.flowCards}>
          {FLOW_STEPS.map((step, index) => (
            <div key={step} className={styles.flowCard}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="arquitetura" className={styles.section}>
        <h2>2. Arquitetura do Sistema</h2>
        <p>
          Frontend e backend convivem no mesmo app Next.js. A separação é feita por
          camadas e contratos tipados, não por múltiplos repositórios.
        </p>
        <div className={styles.layerGrid}>
          {LAYER_ITEMS.map((layer) => (
            <article key={layer.name} className={styles.layerCard}>
              <h3>{layer.name}</h3>
              <p>{layer.description}</p>
              <code>{layer.files}</code>
            </article>
          ))}
        </div>
      </section>

      <section id="pastas" className={styles.section}>
        <h2>3. Estrutura de Pastas</h2>
        <p>
          A árvore abaixo reflete os diretórios mais importantes da base atual.
        </p>
        <FolderTree nodes={FOLDER_TREE} />
        <div className={styles.dirResponsibilityGrid}>
          <article>
            <h3>src/app</h3>
            <p>Rotas visuais e endpoints API no padrão App Router.</p>
          </article>
          <article>
            <h3>src/components</h3>
            <p>Componentes focados em UX para cada fluxo do produto.</p>
          </article>
          <article>
            <h3>src/lib/cube</h3>
            <p>Domínio puro do cubo: estado, regras, movimentos e solver.</p>
          </article>
          <article>
            <h3>src/lib/machine</h3>
            <p>Planejamento mecânico abstrato, mock e contratos de gateway.</p>
          </article>
          <article>
            <h3>src/types</h3>
            <p>Tipos compartilhados entre interface, APIs e domínio.</p>
          </article>
          <article>
            <h3>docs</h3>
            <p>Documentação de arquitetura, scanner, solver, animação e máquina.</p>
          </article>
        </div>
      </section>

      <section id="dominio-cubo" className={styles.section}>
        <h2>4. Domínio do Cubo</h2>
        <p>
          Esta camada existe separada da interface para garantir previsibilidade,
          testes e reuso entre scanner, manual, API e animação.
        </p>
        <TypeTabs tabs={TYPE_TABS} />
        <div className={styles.infoCallout}>
          <h3>Por que separar domínio da UI?</h3>
          <p>
            Porque a regra do cubo é a mesma em qualquer entrada (scanner/manual).
            A UI apenas coleta dados e exibe resultados; a verdade do negócio fica em `src/lib/cube`.
          </p>
        </div>
      </section>

      <section id="scanner" className={styles.section}>
        <h2>5. Scanner por Câmera</h2>
        <p>
          O scanner usa `getUserMedia`, guia visual 3x3 e revisão manual obrigatória.
          O cubo pode estar resolvido ou bagunçado.
        </p>
        <div className={styles.stepGrid}>
          <article>
            <h3>Captura guiada</h3>
            <p>Uma face por vez em ordem `U/R/F/D/L/B`, com confirmação explícita.</p>
          </article>
          <article>
            <h3>Leitura de cores</h3>
            <p>Heurística leve com confiança por face, sem visão computacional pesada no MVP.</p>
          </article>
          <article>
            <h3>Correção manual</h3>
            <p>Usuário edita qualquer sticker antes de enviar para validação/solve.</p>
          </article>
        </div>
      </section>

      <section id="validacao-solver" className={styles.section}>
        <h2>6. Validação e Solver</h2>
        <p>
          O backend garante que só estados coerentes cheguem ao solver. Isso evita
          falhas silenciosas e melhora mensagens para o usuário.
        </p>
        <div className={styles.endpointTable}>
          <div>
            <strong>Validação</strong>
            <p>Checa estrutura, cores, contagem e centros.</p>
            <pre>
              <code>{`POST /api/cube/validate
{ "cubeState": { ... } }`}</code>
            </pre>
          </div>
          <div>
            <strong>Solve</strong>
            <p>Recebe CubeState válido e retorna movimentos lógicos.</p>
            <pre>
              <code>{`POST /api/cube/solve
{
  "jobId": "cube-001",
  "initialCubeState": { ... },
  "logicalMoves": ["R", "U", "R'", "U'", "F2"]
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section id="animacao" className={styles.section}>
        <h2>7. Animação da Solução</h2>
        <p>
          A animação usa apenas `logicalMoves` e `initialCubeState`. Ela não depende
          de comandos mecânicos para avançar frame a frame.
        </p>
        <div className={styles.timeline}>
          <div>Estado inicial</div>
          <div>applyMove/applyMoves</div>
          <div>Atualização visual 2D</div>
          <div>Progresso e movimento atual</div>
          <div>Estado final resolvido</div>
        </div>
      </section>

      <section id="planner" className={styles.section}>
        <h2>8. Planner Mecânico</h2>
        <p>
          O planner converte solução lógica em um plano físico serializável para
          integração futura com a máquina.
        </p>
        <div className={styles.comparisonGrid}>
          <article>
            <h3>logicalMoves</h3>
            <p>Semântica do cubo, independente de hardware.</p>
            <pre>
              <code>{`["R", "U", "R'", "U'", "F2"]`}</code>
            </pre>
          </article>
          <article>
            <h3>mechanicalPlan</h3>
            <p>Ações executáveis por uma controladora física.</p>
            <pre>
              <code>{`{
  "jobId": "cube-001",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "clamp", "name": "A", "state": "close" },
    { "type": "turn_face", "actuator": "right", "degrees": 90 }
  ]
}`}</code>
            </pre>
          </article>
        </div>
      </section>

      <section id="integracao-maquina" className={styles.section}>
        <h2>9. Integração com a Máquina</h2>
        <p>
          A integração já está preparada por contrato e mock. O firmware real ainda
          não foi implementado.
        </p>
        <div className={styles.endpointList}>
          {ENDPOINTS.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`}>
              <span>{endpoint.method}</span>
              <code>{endpoint.path}</code>
              <p>{endpoint.purpose}</p>
            </article>
          ))}
        </div>
        <div className={styles.infoCallout}>
          <h3>Trigger da animação</h3>
          <p>
            A UI inicia a animação quando `GET /api/machine/status` retorna `started`.
            O restante da animação roda localmente com os movimentos lógicos já calculados.
          </p>
        </div>
      </section>

      <section id="fluxo" className={styles.section}>
        <h2>10. Fluxo Ponta a Ponta</h2>
        <ol className={styles.orderedFlow}>
          <li>Capturar ou montar o cubo (`/scan` ou `/manual`).</li>
          <li>Validar estado no backend (`/api/cube/validate`).</li>
          <li>Calcular solução lógica (`/api/cube/solve`).</li>
          <li>Criar `SolveSession` com `mechanicalPlan`.</li>
          <li>Abrir `/solve` e iniciar execução da máquina mock.</li>
          <li>Receber status `started` e disparar animação.</li>
          <li>Concluir visualização com progresso até o final.</li>
        </ol>
      </section>

      <section id="decisoes" className={styles.section}>
        <h2>11. Decisões de Arquitetura</h2>
        <div className={styles.decisionList}>
          <details open>
            <summary>Projeto único em Next.js (frontend + backend)</summary>
            <p>
              Reduz fricção de desenvolvimento e facilita demo, mantendo tipagem
              compartilhada e deploy simplificado.
            </p>
          </details>
          <details>
            <summary>Scanner guiado em vez de visão avançada no MVP</summary>
            <p>
              Priorizou confiabilidade prática com revisão manual, sem criar
              dependência de modelos pesados para esta fase.
            </p>
          </details>
          <details>
            <summary>Animação baseada em logicalMoves</summary>
            <p>
              Mantém a experiência visual desacoplada do hardware e permite teste
              completo mesmo sem ESP32 real.
            </p>
          </details>
          <details>
            <summary>Integração futura via contrato + mock</summary>
            <p>
              Permite trocar apenas o gateway da máquina quando firmware estiver pronto,
              preservando páginas, endpoints e tipos centrais.
            </p>
          </details>
        </div>
      </section>

      <section id="resumo" className={styles.section}>
        <h2>12. Resumo Final</h2>
        <div className={styles.summaryGrid}>
          <article>
            <h3>Já implementado</h3>
            <ul>
              <li>Modelagem e validação do cubo</li>
              <li>Solver lógico e serialização</li>
              <li>Scanner guiado com revisão manual</li>
              <li>Animação em tempo real baseada em logicalMoves</li>
              <li>Planner mecânico abstrato</li>
              <li>API e mock de máquina</li>
            </ul>
          </article>
          <article>
            <h3>Próxima etapa (ESP32)</h3>
            <ul>
              <li>Firmware para executar `MechanicalAction[]`</li>
              <li>Canal de comunicação real com o backend</li>
              <li>Publicação de status `queued/started/finished/error`</li>
              <li>Substituição do mock sem quebrar contratos</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
