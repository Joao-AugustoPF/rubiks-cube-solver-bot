# Fluxo Ponta a Ponta

## Resumo

Este é o fluxo completo atualmente demonstrável, funcionando integralmente com mock.

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
   - exibe dados da sessão e botão de start da máquina mock

6. **Start da máquina mock**
   - `POST /api/machine/start`
   - status inicial `queued`

7. **Polling de status**
   - `GET /api/machine/status?jobId=...`
   - transições `queued -> started -> finished` (ou `error`)

8. **Gatilho da animação**
   - ao receber `started`, animação inicia automaticamente

## Sessão consolidada (`SolveSession`)

- `jobId`
- `initialCubeState`
- `logicalMoves`
- `mechanicalPlan` (`jobId + actions`)
- `animation` (`stepIntervalMs`, `autoPlay`)
- `machineExecution` (`status`, `updatedAt`, `errorMessage?`)

## Endpoints envolvidos no fluxo

- `POST /api/cube/validate`
- `POST /api/cube/solve`
- `POST /api/machine/start`
- `GET /api/machine/status`

## Pontos de extensão futura

- trocar `MockMachineGateway` por integração real com ESP32
- manter o mesmo contrato de start/status para não quebrar frontend
