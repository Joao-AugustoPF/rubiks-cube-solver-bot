# Arquitetura Consolidada

## Visão geral

O projeto é um único app Next.js (App Router + TypeScript) com frontend e backend no mesmo repositório.

Camadas principais:

- **Domínio do cubo**: modelagem, validação, serialização, aplicação de movimentos e solver lógico.
- **Camada de scanner**: captura por câmera, leitura assistida e revisão manual.
- **Sessão de execução**: consolida `initialCubeState`, `logicalMoves`, `mechanicalPlan` e estado de animação.
- **Camada de máquina**: planner mecânico abstrato + contrato de integração + mock.
- **UI de execução**: tela final com start manual, status da máquina e animação.

## Estrutura principal

- `src/app`: páginas e API routes.
- `src/components`: UI por fluxo (`scanner`, `solve`, `cube`).
- `src/lib/cube`: domínio puro do cubo (sem dependência de UI).
- `src/lib/scanner`: leitura de cor e extração da grade 3x3.
- `src/lib/machine`: planner, contrato e mock para substituição futura pelo ESP32.
- `src/lib/solve-session`: criação/persistência da sessão de execução.
- `src/types`: contratos tipados compartilhados.
- `docs`: documentação de arquitetura e fluxos.

## Endpoints implementados

- `GET /api/health`
- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/machine/start`
- `GET /api/machine/status?jobId=...`

## Decisões arquiteturais

- O frontend dispara animação apenas após status `started`.
- A animação não depende de telemetria contínua da máquina.
- A camada de máquina é desacoplada do hardware real por contrato estável.
- O domínio do cubo continua separado de UI e integração externa.

## Escopo implementado agora

- Scanner guiado + revisão manual.
- Validação semântica/estrutural de `CubeState`.
- Solve lógico usando `cubejs`.
- Tela de execução completa em `/solve`.
- Planejamento mecânico abstrato serializável.
- Máquina mock com estados `queued`, `started`, `finished`, `error`.
- Persistência temporária de `SolveSession` no `localStorage`.

## Fora de escopo (mantido)

- Firmware ESP32 real.
- Protocolo físico definitivo (serial/Wi-Fi/BLE).
- Planejamento mecânico específico de hardware.
- Viewer 3D.

## Documentos complementares

- `docs/scanner.md`
- `docs/solver.md`
- `docs/machine-contract.md`
- `docs/animation.md`
- `docs/execution-flow.md`
