# Rubik's Cube Resolver Bot

Projeto em **Next.js (App Router) + TypeScript** com frontend e backend no mesmo app.

## Estado atual (demo funcional)

Fluxos implementados:

- scanner guiado por câmera em `/scan`,
- montagem manual das faces em `/manual`,
- validação de `CubeState`,
- envio para solver 3x3,
- retorno da sequência lógica de solução,
- viewer 2D do cubo,
- animação da solução em `/solve` com play/pause/reset/velocidade,
- planejamento mecânico abstrato,
- mock de máquina com ciclo `queued -> started -> finished/error`,
- gatilho de animação por status `started`.

## Rotas de API

- `GET /api/health`
- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/machine/start`
- `GET /api/machine/status`

## Scripts

```bash
npm run dev
npm run build
npm run test
```

## Fluxo ponta a ponta

1. Capturar/revisar cubo no scanner (`/scan`) ou montar manualmente (`/manual`).
2. Validar e resolver (`/api/cube/validate` + `/api/cube/solve`).
3. Gerar `SolveSession` com `mechanicalPlan`.
4. Abrir execução (`/solve`) e clicar em **Iniciar execução**.
5. Mock da máquina evolui de `queued` para `started`.
6. Ao receber `started`, a animação inicia automaticamente.

## Contratos e tipos centrais

- Cubo: `Face`, `Color`, `CubeState`, `LogicalMove`
- Máquina: `MechanicalAction`, `MachineStartRequest`, `MachineStatusResponse`, `MachineStatus`
- Sessão: `SolveSession`

Arquivos:

- `src/types/cube.ts`
- `src/types/machine.ts`
- `src/types/session.ts`

## Documentação

- Arquitetura consolidada: `docs/architecture.md`
- Scanner: `docs/scanner.md`
- Solver e validação: `docs/solver.md`
- Contrato da máquina (mock -> ESP32): `docs/machine-contract.md`
- Animação: `docs/animation.md`
- Fluxo ponta a ponta: `docs/execution-flow.md`

## O que falta (integração ESP32 real)

Esta base **não implementa firmware**. A próxima etapa é substituir o gateway mock por integração real com ESP32, mantendo os mesmos contratos de start/status e o formato do plano mecânico.
