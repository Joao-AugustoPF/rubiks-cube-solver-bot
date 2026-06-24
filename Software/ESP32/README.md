# ESP32 Wi-Fi + Next.js — Guia de integração

## O que muda em relação à versão Serial

| **Antes (Serial)** | **Agora (Wi-Fi)** | 
|---|---|
| Backend lê porta COM/ttyUSB | ESP32 faz polling HTTP no backend |
| JSON por linha `\n` | JSON em body/query HTTP |
| IP fixo ou hardcodado no código | ESP32 registra presença no boot e usa NVS |
| Só funciona com cabo USB | Funciona em qualquer rede | 

## 1. Configurar o Firmware (Provisionamento Dinâmico)

Não **precisas mais de alterar o código-fonte** para ligar a redes Wi-Fi diferentes. O sistema usa a memória não-volátil (NVS) do ESP32 para guardar as credenciais de forma permanente.

**Primeira Inicialização (Modo AP):**

1. O ESP32 liga, verifica que a NVS está vazia e cria uma rede Wi-Fi própria chamada **`RubikSolver-Setup`**.

2. Liga-te a essa rede com o teu computador ou telemóvel.

3. Envia as credenciais da rede definitiva através da rota `/provision` (vê a secção 5).

4. O ESP32 reiniciará automaticamente, ligar-se-á à rede configurada e fará o registo do próprio IP chamando o backend.

## 2. Reset de Fábrica (Factory Reset)

Para levar a máquina para outro laboratório, casa ou evento, precisas de apagar as configurações de Wi-Fi antigas:

1. Liga a placa à energia (ou prime o botão de reset `EN`).

2. O Monitor Serial avisará: `[BOOT] Voce tem 3 SEGUNDOS para apertar o botao BOOT...`

3. Durante essa janela, prime o botão físico **BOOT (GPIO 0)** na placa ESP32.

4. O LED piscará rapidamente, a memória será apagada e a placa reiniciará no modo de provisionamento (`RubikSolver-Setup`).

## 3. Configurar o Next.js

Adiciona no `.env.local` (desenvolvimento) e nas variáveis de ambiente do VPS:

` ` `env
DEVICE_SECRET=meu-segredo-123

# Opcional para desenvolvimento sem hardware:
# MACHINE_GATEWAY=mock

# Opcional para bancada local, quando o Next está na mesma rede do ESP32:
# MACHINE_GATEWAY=direct
# DEVICE_IP_OVERRIDE=192.168.1.42
` ` `

> O `DEVICE_SECRET` é uma chave partilhada entre o ESP32 e o Next.js.
> Toda a requisição carrega o header `X-Device-Secret` para autenticação.

### Onde colocar os ficheiros

Copia os ficheiros TypeScript para o teu projeto Next.js:

` ` `text
src/app/api/
├── device/
│   ├── register/
│   │   └── route.ts
│   └── jobs/
│       ├── next/route.ts
│       └── status/route.ts
└── machine/
    ├── start/
    │   └── route.ts        ← machine-start.ts
    └── status/
        └── route.ts        ← machine-status.ts
` ` `

## 4. Fluxo completo de Execução

` ` `text
ESP32 boot (Rede configurada)
  └─► POST https://oteudominio.com/api/device/register
        body: { ip: "192.168.1.42", deviceId: "maquina-cubo-01" }
        header: X-Device-Secret: <secret>
        ← { ok: true }

Frontend clica "Iniciar execução"
  └─► POST /api/machine/start
        body: { jobId: "cube-001", notation: "U R2 F B U D L2", actions: [...] }
        cookie: rubik_solver_operator=<aba operadora>
        ← { jobId: "cube-001", status: "queued" }

ESP32 faz polling no backend público
  └─► GET https://oteudominio.com/api/device/jobs/next?deviceId=maquina-cubo-01
        header: X-Device-Secret: <secret>
        ← { hasJob: true, job: { jobId: "cube-001", notation: "...", actions: [...] } }

ESP32 executa e reporta progresso
  └─► POST https://oteudominio.com/api/device/jobs/status
        body: { jobId: "cube-001", status: "started", progress: {...} }

Frontend faz polling
  └─► GET /api/machine/status?jobId=cube-001
        ← { jobId: "cube-001", status: "started", progress: {...} }

Web deriva o estado atual do cubo a partir do progresso físico ✓
` ` `

## 5. Testar o ESP32 manualmente (cURL)

Podes testar todos os endpoints diretamente do teu terminal:

**A. Provisionar o Wi-Fi (Correr ligado na rede `RubikSolver-Setup`):**

` ` `bash
curl -X POST http://192.168.4.1/provision \
  -H "Content-Type: application/json" \
  -d '{
        "wifiSsid": "NomeDaTuaRedeReal",
        "wifiPassword": "SenhaDaTuaRedeReal",
        "secret": "meu-segredo-123",
        "deviceId": "maquina-cubo-01"
      }'
` ` `

**B. Health check (Correr ligado na rede real):**

` ` `bash
curl -X GET http://IP_DO_ESP32/health
` ` `

**C. Buscar próximo job pelo ESP32:**

` ` `bash
curl -X GET "https://oteudominio.com/api/device/jobs/next?deviceId=maquina-cubo-01" \
  -H "X-Device-Secret: meu-segredo-123" \
  -H "X-Device-IP: 192.168.1.42"
` ` `

**D. Reportar Status do Job pelo ESP32:**

` ` `bash
curl -X POST "https://oteudominio.com/api/device/jobs/status" \
  -H "Content-Type: application/json" \
  -H "X-Device-Secret: meu-segredo-123" \
  -H "X-Device-IP: 192.168.1.42" \
  -d '{
        "deviceId": "maquina-cubo-01",
        "jobId": "teste-001",
        "status": "started",
        "progress": {
          "currentActionIndex": 1,
          "completedActions": 1,
          "totalActions": 2,
          "currentActionType": "wait"
        }
      }'
` ` `

Resposta esperada:

` ` `json
{
  "jobId": "teste-001",
  "status": "started",
  "updatedAt": "2026-06-24T18:00:00Z",
  "progress": {
    "currentActionIndex": 1,
    "completedActions": 1,
    "totalActions": 2,
    "currentActionType": "wait"
  }
}
` ` `

## 6. Por que polling resolve o problema de NAT

Se o Next.js está num VPS público e o ESP32 está na rede privada da faculdade/casa:

O VPS **não consegue** fazer o `POST http://192.168.x.x/start` diretamente — esse IP é privado e bloqueado pelo router.

Por isso o fluxo oficial é invertido:

1. Web cria job no backend público.
2. ESP32 chama o backend público perguntando se há job.
3. ESP32 executa e envia progresso para o backend.
4. Web lê o progresso do backend.

Assim não precisa port forwarding, ngrok nem IP público na rede do ESP32.
