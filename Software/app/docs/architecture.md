# Arquitetura Consolidada

## Visão geral

O projeto é um único app Next.js (App Router + TypeScript) com frontend e backend no mesmo repositório.

Camadas principais:

- **Domínio do cubo**: modelagem, validação, serialização, aplicação de movimentos e solver lógico.
- **Camada de scanner**: captura por câmera, leitura assistida e revisão manual.
- **Sessão de execução**: consolida `initialCubeState`, `logicalMoves`, `mechanicalPlan` e progresso da máquina.
- **Camada de máquina**: planner mecânico abstrato, gateway ESP32, fallback mock e controle de operador.
- **UI de execução**: tela final com sessão ativa compartilhada, status da máquina e cubo 3D.

## Estrutura principal

- `src/app`: páginas e API routes.
- `src/components`: UI por fluxo (`scanner`, `solve`, `cube`).
- `src/lib/cube`: domínio puro do cubo (sem dependência de UI).
- `src/lib/scanner`: leitura de cor e extração da grade 3x3.
- `src/lib/machine`: planner, contrato, gateway ESP32, mock e sessão ativa.
- `src/lib/solve-session`: criação/persistência da sessão de execução.
- `src/types`: contratos tipados compartilhados.
- `docs`: documentação de arquitetura e fluxos.

## Endpoints implementados

- `GET /api/health`
- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/device/register`
- `GET|POST|DELETE /api/machine/session`
- `POST /api/machine/start`
- `GET /api/machine/status?jobId=...`

## Decisões arquiteturais

- O frontend usa progresso contínuo da máquina quando disponível.
- Sem telemetria, a visualização ainda consegue usar animação local após `started`.
- A camada de máquina mantém contrato estável para ESP32 e mock.
- O domínio do cubo continua separado de UI e integração externa.

## Escopo implementado agora

- Scanner guiado + revisão manual.
- Validação semântica/estrutural de `CubeState`.
- Solve lógico usando `cubejs`.
- Tela de execução completa em `/solve`.
- Planejamento mecânico abstrato serializável.
- Gateway HTTP para ESP32 com fallback mock.
- Controle de aba operadora por cookie HTTP-only.
- Sessão ativa compartilhada no backend para visualizadores.
- Persistência temporária de `SolveSession` no `localStorage`.

## Fora de escopo (mantido)

- Persistência distribuída de sessão ativa/operador em banco ou Redis.
- Planejamento mecânico específico da cinemática final.
- Feedback fino por sensores além do progresso por ação.

## Documentos complementares

- `docs/scanner.md`
- `docs/solver.md`
- `docs/machine-contract.md`
- `docs/animation.md`
- `docs/execution-flow.md`
