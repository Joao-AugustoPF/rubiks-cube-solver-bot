# Fluxo Ponta a Ponta

## Resumo

Este é o fluxo completo com ESP32 real via HTTP e fallback mock para desenvolvimento.

## Sequência

1. **Scanner ou montagem manual**
   - `/scan` ou `/manual`
   - resultado: `CubeState`

2. **Validação**
   - `POST /api/cube/validate`
   - garante estrutura e semântica do estado

3. **Solve lógico**
   - `POST /api/cube/solve`
   - retorna `jobId`, `initialCubeState`, `logicalMoves`

4. **Criação da sessão**
   - `createSolveSession(...)`
   - gera `mechanicalPlan` via planner
   - persiste em `localStorage`

5. **Tela de execução**
   - `/solve`
   - tenta assumir a operação via `/api/machine/session`
   - exibe dados da sessão local ou sessão ativa já existente

6. **Start da máquina**
   - `POST /api/machine/start`
   - exige cookie da aba operadora
   - status inicial `queued`

7. **Polling de status**
   - `GET /api/machine/status?jobId=...`
   - transições `queued -> started -> finished` (ou `error`)
   - inclui `progress` quando ESP/mock reporta avanço

8. **Visualização sincronizada**
   - com `progress.currentLogicalMoveIndex`, o cubo 3D mostra o estado físico atual
   - sem progresso, a animação local começa quando status vira `started`

## Sessão consolidada (`SolveSession`)

- `jobId`
- `initialCubeState`
- `logicalMoves`
- `mechanicalPlan` (`jobId + actions`)
- `animation` (`stepIntervalMs`, `autoPlay`)
- `machineExecution` (`status`, `updatedAt`, `errorMessage?`, `progress?`)

## Endpoints envolvidos no fluxo

- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/device/register`
- `GET|POST|DELETE /api/machine/session`
- `POST /api/machine/start`
- `GET /api/machine/status`

## Pontos de extensão futura

- persistir sessão ativa e operador em Redis/banco quando houver múltiplas instâncias Next.js
- evoluir `MechanicalAction` conforme a cinemática final do robô
