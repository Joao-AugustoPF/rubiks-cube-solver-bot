# Contrato de Integração da Máquina (Mock -> ESP32)

Este documento define o contrato estável entre frontend/backend e a futura implementação no ESP32.

## Objetivo

Permitir que o sistema atual rode 100% com mock, mas com contratos prontos para troca por hardware real sem quebrar UI, APIs ou tipos.

## Tipos principais

- `MechanicalAction`
- `MachineStartRequest`
- `MachineStatusResponse`
- `MachineStatus` (`queued | started | finished | error`)

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

Inicia execução de um job na máquina (mock nesta etapa).

Request:

```json
{
  "jobId": "cube-001",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "clamp", "name": "A", "state": "close" },
    { "type": "turn_face", "actuator": "right", "degrees": 90 }
  ]
}
```

Response:

```json
{
  "jobId": "cube-001",
  "status": "queued",
  "updatedAt": "2026-04-08T17:00:00.000Z"
}
```

### `GET /api/machine/status?jobId=cube-001`

Consulta status do job.

Response (exemplo):

```json
{
  "jobId": "cube-001",
  "status": "started",
  "updatedAt": "2026-04-08T17:00:01.200Z"
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

## Comportamento no frontend

- A animação **não depende** de feedback contínuo.
- Ela começa quando status vira `started`.
- O estado de execução é persistido em `SolveSession.machineExecution`.

## O que o firmware (outro integrante) precisa implementar

1. Receber `MachineStartRequest` (ou equivalente transportado para ESP32).
2. Executar `actions` na ordem, com idempotência por `jobId`.
3. Expor/transmitir status compatível com:
  - `queued`
  - `started`
  - `finished`
  - `error`
4. Retornar mensagem de erro quando falhar.
5. Manter compatibilidade de contrato para não quebrar frontend/backend já existentes.

## Fora de escopo deste documento

- protocolo físico de transporte (serial, Wi-Fi, BLE),
- cinemática detalhada da máquina,
- calibração de motores e sensores.
