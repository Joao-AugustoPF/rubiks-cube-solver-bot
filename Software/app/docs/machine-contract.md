# Contrato de Integração da Máquina (Next.js -> ESP32)

Este documento define o contrato estável entre frontend/backend e o firmware ESP32.

## Objetivo

Permitir que o sistema rode com ESP32 real via HTTP e mantenha fallback mock para desenvolvimento sem hardware.

## Tipos principais

- `MechanicalAction`
- `MachineStartRequest`
- `MachineStatusResponse`
- `MachineStatus` (`queued | started | finished | error`)
- `MachineProgress`
- `MachineControlSessionResponse`

Arquivos de referência:

- `src/types/machine.ts`
- `src/lib/machine/contracts.ts`

## Plano mecânico

Formato serializável esperado:

```json
{
  "jobId": "cube-001",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "clamp", "name": "A", "state": "close" },
    { "type": "rotate_cube", "axis": "x", "degrees": 90 },
    { "type": "turn_face", "actuator": "right", "degrees": 90 }
  ]
}
```

Observação: o planner atual já gera `home`, `clamp`, `turn_face` e `wait`. `rotate_cube` está previsto no contrato para evolução.

## Endpoints

### `POST /api/machine/start`

Inicia execução de um job. Apenas a aba operadora, identificada por cookie
HTTP-only criado em `/api/machine/session`, pode chamar esta rota com sucesso.

Request:

```json
{
  "jobId": "cube-001",
  "notation": "U R2 F",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "clamp", "name": "A", "state": "close" },
    { "type": "turn_face", "actuator": "right", "degrees": 90 }
  ],
  "initialCubeState": { "...": "CubeState usado pela UI" },
  "logicalMoves": ["U", "R2", "F"]
}
```

Response:

```json
{
  "jobId": "cube-001",
  "status": "queued",
  "updatedAt": "2026-04-08T17:00:00.000Z",
  "progress": {
    "currentActionIndex": 0,
    "completedActions": 0,
    "totalActions": 3,
    "currentLogicalMoveIndex": 0,
    "totalLogicalMoves": 3
  },
  "gatewayMode": "esp32"
}
```

Sem cookie de operador, a rota retorna `423`.

### `GET /api/machine/status?jobId=cube-001`

Consulta status do job.

Response (exemplo):

```json
{
  "jobId": "cube-001",
  "status": "started",
  "updatedAt": "2026-04-08T17:00:01.200Z",
  "progress": {
    "currentActionIndex": 2,
    "completedActions": 2,
    "totalActions": 8,
    "currentActionType": "turn_face",
    "currentLogicalMoveIndex": 1,
    "totalLogicalMoves": 4
  },
  "currentCubeState": { "...": "CubeState derivado pela web" }
}
```

Erro (exemplo):

```json
{
  "jobId": "cube-001",
  "status": "error",
  "updatedAt": "2026-04-08T17:00:01.200Z",
  "errorMessage": "Falha simulada do controlador mock."
}
```

### `POST /api/device/register`

Chamado pelo ESP32 no boot/reconexão para informar o IP atual.

Headers:

```text
X-Device-Secret: <DEVICE_SECRET>
```

Request:

```json
{
  "ip": "192.168.1.42",
  "deviceId": "rubik-solver-01"
}
```

Response:

```json
{
  "ok": true,
  "deviceId": "rubik-solver-01",
  "ip": "192.168.1.42",
  "baseUrl": "http://192.168.1.42",
  "lastSeenAt": "2026-04-08T17:00:00.000Z"
}
```

### `GET|POST|DELETE /api/machine/session`

Gerencia a aba operadora e expõe a sessão ativa.

- `POST`: tenta assumir/renovar controle.
- `GET`: consulta controle sem assumir.
- `DELETE`: libera controle da aba atual.

## Comportamento no frontend

- A UI usa progresso contínuo quando `progress.currentLogicalMoveIndex` existe.
- Sem progresso de máquina, ela ainda consegue animar por tempo local após `started`.
- O estado de execução é persistido em `SolveSession.machineExecution`.
- Outras abas podem ler a sessão ativa, mas não iniciar comandos sem cookie de operador.

## O que o firmware precisa implementar

1. Receber `MachineStartRequest` (ou equivalente transportado para ESP32).
2. Executar `actions` na ordem, com idempotência por `jobId`.
3. Expor/transmitir status compatível com:
  - `queued`
  - `started`
  - `finished`
  - `error`
4. Retornar mensagem de erro quando falhar.
5. Retornar `progress` com `currentActionIndex`, `completedActions`, `totalActions` e `currentActionType`.
6. Manter compatibilidade de contrato para não quebrar frontend/backend já existentes.

## Fora de escopo deste documento

- protocolo físico de transporte (serial, Wi-Fi, BLE),
- cinemática detalhada da máquina,
- calibração de motores e sensores.
