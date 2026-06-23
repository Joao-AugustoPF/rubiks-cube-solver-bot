# ESP32 Wi-Fi + Next.js — Guia de integração

## O que muda em relação à versão Serial

| **Antes (Serial)** | **Agora (Wi-Fi)** | 
|---|---|
| Backend lê porta COM/ttyUSB | Backend faz fetch HTTP | 
| JSON por linha `\n` | JSON em body/query HTTP | 
| IP fixo ou hardcodado no código | ESP32 regista próprio IP no boot e usa NVS | 
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

# Opcional: força um IP fixo durante desenvolvimento (sem precisar do ESP32 físico)
# DEVICE_IP_OVERRIDE=192.168.1.42
` ` `

> O `DEVICE_SECRET` é uma chave partilhada entre o ESP32 e o Next.js.
> Toda a requisição carrega o header `X-Device-Secret` para autenticação.

### Onde colocar os ficheiros

Copia os ficheiros TypeScript para o teu projeto Next.js:

` ` `text
src/app/api/
├── device/
│   └── register/
│       └── route.ts        ← device-register.ts
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

Next.js recebe e encaminha ao ESP32
  └─► POST http://192.168.1.42/start
        body: { jobId: "cube-001", notation: "U R2 F B U D L2", actions: [...] }
        header: X-Device-Secret: <secret>
        ← { jobId: "cube-001", status: "queued", updatedAt: "..." }

Frontend faz polling
  └─► GET /api/machine/status?jobId=cube-001
        └─► GET http://192.168.1.42/status?jobId=cube-001
            ← { jobId: "cube-001", status: "started", updatedAt: "..." }

Animação inicia quando status = "started" ✓
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

**C. Enviar Job de Resolução:**
*(Nota: O ESP32 agora recebe a notação do cubo, além das ações mecânicas)*

` ` `bash
curl -X POST http://IP_DO_ESP32/start \
  -H "Content-Type: application/json" \
  -H "X-Device-Secret: meu-segredo-123" \
  -d '{
        "jobId": "teste-001",
        "notation": "U R2 F B U D L2",
        "actions": [
          { "type": "home", "target": "all" },
          { "type": "wait", "ms": 5000 }
        ]
      }'
` ` `

**D. Consultar Status do Job:**

` ` `bash
curl -X GET "http://IP_DO_ESP32/status?jobId=teste-001" \
  -H "X-Device-Secret: meu-segredo-123"
` ` `

## 6. Problema com VPS → ESP32 (NAT)

Se o Next.js está num VPS público e o ESP32 está na rede privada da faculdade/casa:

O VPS **não consegue** fazer o `POST http://192.168.x.x/start` diretamente — esse IP é privado e bloqueado pelo router.

**Solução A — Inverter o polling**: Em vez do Next.js chamar o ESP32, o ESP32 faz polling no Next.js perguntando se há novos jobs.
**Solução B — Túnel ngrok/cloudflared**: Expõe o ESP32 com URL pública temporária (a correr num Raspberry/PC na mesma rede).
**Solução C — Port Forwarding**: Configurar o router do laboratório para redirecionar o tráfego da porta 80 externa para o IP fixo local do ESP32.
