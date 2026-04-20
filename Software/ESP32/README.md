# ESP32 Wi-Fi + Next.js — Guia de integração

## O que muda em relação à versão Serial

| Antes (Serial) | Agora (Wi-Fi) |
|---|---|
| Backend lê porta COM/ttyUSB | Backend faz fetch HTTP |
| JSON por linha `\n` | JSON em body/query HTTP |
| IP fixo no código do backend | ESP32 registra próprio IP no boot |
| Só funciona com cabo USB | Funciona em qualquer rede |

---

## 1. Configurar o firmware

Edite as três constantes no topo de `src/main.cpp`:

```cpp
#define WIFI_SSID           "NomeDaSuaRede"
#define WIFI_PASSWORD       "SenhaDaRede"
#define NEXTJS_REGISTER_URL "https://seudominio.com/api/device/register"
#define DEVICE_SECRET       "mude-esta-chave-secreta"
```

> O `DEVICE_SECRET` é uma chave compartilhada entre o ESP32 e o Next.js.
> Toda requisição carrega o header `X-Device-Secret` para autenticação.

---

## 2. Configurar o Next.js

Adicione no `.env.local` (desenvolvimento) e nas variáveis de ambiente do VPS:

```env
DEVICE_SECRET=mude-esta-chave-secreta

# Opcional: força um IP fixo durante desenvolvimento (sem precisar do ESP32 físico)
# DEVICE_IP_OVERRIDE=192.168.1.42
```

### Onde colocar os arquivos

Copie os arquivos TypeScript para o seu projeto Next.js:

```
src/app/api/
├── device/
│   └── register/
│       └── route.ts        ← device-register.ts
└── machine/
    ├── start/
    │   └── route.ts        ← machine-start.ts
    └── status/
        └── route.ts        ← machine-status.ts
```

---

## 3. Fluxo completo

```
ESP32 boot
  └─► POST https://seudominio.com/api/device/register
        body: { ip: "192.168.1.42", deviceId: "rubik-solver-01" }
        header: X-Device-Secret: <secret>
        ← { ok: true }

Frontend clica "Iniciar execução"
  └─► POST /api/machine/start
        body: { jobId: "cube-001", actions: [...] }

Next.js recebe e encaminha ao ESP32
  └─► POST http://192.168.1.42/start
        body: { jobId: "cube-001", actions: [...] }
        header: X-Device-Secret: <secret>
        ← { jobId: "cube-001", status: "queued", updatedAt: "..." }

Frontend faz polling (já implementado no /solve)
  └─► GET /api/machine/status?jobId=cube-001
        └─► GET http://192.168.1.42/status?jobId=cube-001
            ← { jobId: "cube-001", status: "started", updatedAt: "..." }

Animação inicia quando status = "started" ✓
```

---

## 4. Testar o ESP32 manualmente

Com o ESP32 na rede, você pode testar direto do terminal do VPS ou da sua máquina:

```bash
# Health check
curl http://IP_DO_ESP32/health

# Enviar job
curl -X POST http://IP_DO_ESP32/start \
  -H "Content-Type: application/json" \
  -H "X-Device-Secret: mude-esta-chave-secreta" \
  -d '{"jobId":"teste-1","actions":[{"type":"home","target":"all"},{"type":"wait","durationMs":500}]}'

# Consultar status
curl "http://IP_DO_ESP32/status?jobId=teste-1" \
  -H "X-Device-Secret: mude-esta-chave-secreta"
```

---

## 5. Descobrir o IP do ESP32 na rede

Se não souber o IP, use uma das opções:

**Via Serial Monitor** — no boot, o ESP32 imprime:
```
[WiFi] Conectado! IP: 192.168.1.42
```

**Via roteador** — acesse o painel do roteador e procure por `espressif` ou `ESP32` na lista de dispositivos DHCP.

**Via nmap** (Linux/Mac):
```bash
nmap -sn 192.168.1.0/24 | grep -i esp
```

Para garantir que o IP não mude, configure uma reserva DHCP no roteador usando o MAC address do ESP32 (também impresso no boot com `WiFi.macAddress()`).

---

## 6. Segurança em produção

O `X-Device-Secret` é suficiente para desenvolvimento. Para produção considere:

- HTTPS no ESP32 (requer certificado — mais complexo no ESP32)
- Restringir o `NEXTJS_REGISTER_URL` a accept somente requisições do IP da rede local
- Adicionar rate limiting na rota `/api/device/register`
- Rotacionar o `DEVICE_SECRET` periodicamente

---

## 7. Problema com VPS → ESP32 (NAT)

Se o Next.js está num VPS na internet e o ESP32 está numa rede doméstica:

O VPS **não consegue** chamar `http://192.168.x.x` diretamente — esse IP é privado.

**Solução A — Inverter o polling**: em vez do Next.js chamar o ESP32, o ESP32 faz polling no Next.js. Isso é mais simples para redes domésticas.

**Solução B — Túnel ngrok/cloudflared**: expõe o ESP32 com URL pública temporária.

**Solução C — IP público com port forwarding**: configura o roteador para redirecionar a porta 80 para o ESP32.

Se você está nessa situação, me avise que adapto o firmware para a Solução A (ESP32 como cliente de polling).
