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
- fila de jobs para ESP32 via polling HTTP, com fallback para mock local,
- registro/heartbeat do ESP32 em `POST /api/device/register`,
- sessão ativa compartilhada no backend para espectadores acompanharem,
- bloqueio de início por aba operadora,
- progresso físico por ação (`completedActions/totalActions`) sincronizando o cubo 3D.

## Rotas de API

- `GET /api/health`
- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/device/register`
- `GET /api/device/jobs/next`
- `POST /api/device/jobs/status`
- `GET|POST|DELETE /api/machine/session`
- `POST /api/machine/start`
- `GET /api/machine/status`

## Variáveis de ambiente da máquina

```bash
DEVICE_SECRET=meu-segredo-compartilhado

# Opcional:
MACHINE_GATEWAY=mock   # força mock local
MACHINE_GATEWAY=direct # modo bancada: Next chama o IP do ESP32 diretamente
DEVICE_IP_OVERRIDE=192.168.1.42 # usado apenas no modo direct
MACHINE_OPERATOR_LEASE_SECONDS=1800
```

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
5. Backend deixa o job na fila.
6. ESP32 chama `GET /api/device/jobs/next`, baixa o job e executa.
7. ESP32 reporta progresso em `POST /api/device/jobs/status`.
8. `/solve` faz polling de status e mostra o cubo conforme o progresso reportado.

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
- Contrato da máquina (Next.js -> ESP32): `docs/machine-contract.md`
- Animação: `docs/animation.md`
- Fluxo ponta a ponta: `docs/execution-flow.md`

## Observação sobre estado físico

O backend só conhece o estado físico depois que alguém cria uma sessão pelo
scanner/editor ou inicia uma execução. A partir desse ponto, outras abas
conseguem abrir `/solve` e acompanhar a sessão ativa sem poder enviar comandos.
