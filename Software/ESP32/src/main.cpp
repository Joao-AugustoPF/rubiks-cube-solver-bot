/*
 * Rubik's Cube Resolver — ESP32 Firmware (Wi-Fi + HTTP Server)
 * ═════════════════════════════════════════════════════════════
 *
 * Fluxo de boot:
 *   1. Conecta ao Wi-Fi
 *   2. Sobe servidor HTTP na porta 80
 *   3. Registra o próprio IP no Next.js (POST /api/device/register)
 *   4. Aguarda requisições HTTP do Next.js
 *
 * Endpoints expostos pelo ESP32:
 *   POST /start   — recebe {jobId, actions[]}, responde {status:"queued"}
 *   GET  /status  — recebe ?jobId=x, responde {jobId, status, updatedAt}
 *   GET  /health  — liveness check, responde {ok:true, ip, uptime}
 *
 * Tasks FreeRTOS:
 *   taskHttp    (Core 0, P4) — loop do servidor HTTP (WebServer.handleClient)
 *   taskSolver  (Core 1, P2) — dinâmica, executa ações, se auto-deleta
 *   taskLed     (Core 1, P1) — pisca LEDs conforme estado do job
 *   taskWatchdog(Core 0, P2) — monitora Wi-Fi e reconecta se necessário
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO — edite aqui antes de gravar
// ═══════════════════════════════════════════════════════════════════════════════
#define WIFI_SSID        "SUA_REDE_WIFI"
#define WIFI_PASSWORD    "SUA_SENHA_WIFI"

// URL completa da rota de registro no Next.js
// Exemplo: "https://meuapp.vercel.app/api/device/register"
#define NEXTJS_REGISTER_URL  "https://SEU_VPS_OU_DOMINIO/api/device/register"

// Chave secreta compartilhada entre ESP32 e Next.js
// Defina a mesma string em DEVICE_SECRET no .env do Next.js
#define DEVICE_SECRET    "mude-esta-chave-secreta"

// Pinos
#define LED_STATUS   2
#define LED_RUNNING  4

// Tamanhos de stack das tasks
#define STACK_HTTP       6144
#define STACK_SOLVER     8192
#define STACK_LED        1024
#define STACK_WATCHDOG   2048

// Tamanho máximo do body de uma requisição HTTP
#define HTTP_BODY_SIZE   8192

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════
enum JobStatus : uint8_t { IDLE, QUEUED, STARTED, FINISHED, JOB_ERROR };

struct Job {
  char       id[64];
  JobStatus  status;
  char       errorMsg[128];
  TickType_t startedAt;
};

struct SolverPayload {
  char jobId[64];
  char actionsJson[HTTP_BODY_SIZE];
};

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════
static Job               currentJob       = { "", IDLE, "", 0 };
static SemaphoreHandle_t jobMutex         = nullptr;
static SemaphoreHandle_t httpMutex        = nullptr;  // protege WebServer (não thread-safe)
static TaskHandle_t      solverTaskHandle = nullptr;
static WebServer         server(80);

// ═══════════════════════════════════════════════════════════════════════════════
// PROTÓTIPOS
// ═══════════════════════════════════════════════════════════════════════════════
void taskHttp     (void* pv);
void taskSolver   (void* pv);
void taskLed      (void* pv);
void taskWatchdog (void* pv);

void handleStart  ();
void handleStatus ();
void handleHealth ();
void handleNotFound();

bool registerWithNextJs();

bool executeAction     (JsonObject action);
bool actuatorHome      (JsonObject a);
bool actuatorClamp     (JsonObject a);
bool actuatorTurnFace  (JsonObject a);
bool actuatorRotateCube(JsonObject a);
bool actuatorWait      (JsonObject a);

void        setJobStatus(JobStatus s, const char* errMsg = nullptr);
JobStatus   getJobStatus();
void        sendJsonResponse(int code, JsonDocument& doc);
const char* statusStr(JobStatus s);
String      isoTimestamp();

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  pinMode(LED_STATUS,  OUTPUT);
  pinMode(LED_RUNNING, OUTPUT);

  // Pisca durante boot
  for (int i = 0; i < 4; i++) {
    digitalWrite(LED_STATUS, HIGH); delay(80);
    digitalWrite(LED_STATUS, LOW);  delay(80);
  }

  // Primitivas de sincronização
  jobMutex  = xSemaphoreCreateMutex();
  httpMutex = xSemaphoreCreateMutex();
  configASSERT(jobMutex);
  configASSERT(httpMutex);

  // Conecta Wi-Fi (bloqueante no setup — antes das tasks)
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FALHA na conexão. Reiniciando em 5s...");
    delay(5000);
    ESP.restart();
  }

  // Registra rotas HTTP
  server.on("/start",  HTTP_POST, handleStart);
  server.on("/status", HTTP_GET,  handleStatus);
  server.on("/health", HTTP_GET,  handleHealth);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("[HTTP] Servidor iniciado na porta 80");

  // Registra IP no Next.js
  bool registered = false;
  for (int i = 0; i < 5 && !registered; i++) {
    registered = registerWithNextJs();
    if (!registered) {
      Serial.printf("[REG] Tentativa %d falhou, aguardando 3s...\n", i + 1);
      delay(3000);
    }
  }
  if (!registered) {
    Serial.println("[REG] AVISO: Não foi possível registrar no Next.js. Continuando...");
  }

  // Cria tasks fixas
  xTaskCreatePinnedToCore(taskHttp,     "http",     STACK_HTTP,     nullptr, 4, nullptr, 0);
  xTaskCreatePinnedToCore(taskLed,      "led",      STACK_LED,      nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(taskWatchdog, "watchdog", STACK_WATCHDOG, nullptr, 2, nullptr, 0);

  Serial.println("[ESP32] Pronto. Aguardando requisições HTTP.");
}

void loop() { vTaskDelay(portMAX_DELAY); }

// ═══════════════════════════════════════════════════════════════════════════════
// TASK: taskHttp — processa requisições HTTP continuamente
// ═══════════════════════════════════════════════════════════════════════════════
void taskHttp(void* pv) {
  for (;;) {
    xSemaphoreTake(httpMutex, portMAX_DELAY);
    server.handleClient();
    xSemaphoreGive(httpMutex);
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK: taskWatchdog — reconecta Wi-Fi se cair
// ═══════════════════════════════════════════════════════════════════════════════
void taskWatchdog(void* pv) {
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(10000)); // verifica a cada 10s

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Conexão perdida. Reconectando...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        vTaskDelay(pdMS_TO_TICKS(500));
        attempts++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] Reconectado! IP: %s\n", WiFi.localIP().toString().c_str());
        registerWithNextJs(); // re-registra o IP após reconexão
      } else {
        Serial.println("[WiFi] Falha ao reconectar.");
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO NO NEXT.JS
// ═══════════════════════════════════════════════════════════════════════════════
bool registerWithNextJs() {
  HTTPClient http;
  http.begin(NEXTJS_REGISTER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Secret", DEVICE_SECRET);

  StaticJsonDocument<128> body;
  body["ip"]       = WiFi.localIP().toString();
  body["deviceId"] = "rubik-solver-01";

  String bodyStr;
  serializeJson(body, bodyStr);

  int code = http.POST(bodyStr);
  bool ok  = (code == 200 || code == 201);

  Serial.printf("[REG] POST %s → HTTP %d%s\n",
                NEXTJS_REGISTER_URL, code, ok ? " OK" : " ERRO");
  http.end();
  return ok;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLERS HTTP
// ═══════════════════════════════════════════════════════════════════════════════

// POST /start
// Body: {"jobId":"x","actions":[...]}
// Resposta: {"jobId":"x","status":"queued","updatedAt":"..."}
void handleStart() {
  // Valida secret header
  if (server.header("X-Device-Secret") != DEVICE_SECRET) {
    StaticJsonDocument<64> err;
    err["error"] = "Unauthorized";
    sendJsonResponse(401, err);
    return;
  }

  if (!server.hasArg("plain") || server.arg("plain").isEmpty()) {
    StaticJsonDocument<64> err;
    err["error"] = "Body vazio";
    sendJsonResponse(400, err);
    return;
  }

  StaticJsonDocument<HTTP_BODY_SIZE> doc;
  DeserializationError parseErr = deserializeJson(doc, server.arg("plain"));
  if (parseErr) {
    StaticJsonDocument<128> err;
    err["error"] = "JSON inválido";
    err["detail"] = parseErr.c_str();
    sendJsonResponse(400, err);
    return;
  }

  const char* jobId = doc["jobId"] | "";
  if (strlen(jobId) == 0) {
    StaticJsonDocument<64> err;
    err["error"] = "jobId ausente";
    sendJsonResponse(400, err);
    return;
  }

  // Idempotência
  xSemaphoreTake(jobMutex, portMAX_DELAY);
  bool alreadyRunning = (strcmp(currentJob.id, jobId) == 0) &&
                        (currentJob.status == QUEUED || currentJob.status == STARTED);
  JobStatus curStatus = currentJob.status;
  xSemaphoreGive(jobMutex);

  if (alreadyRunning) {
    StaticJsonDocument<128> resp;
    resp["jobId"]     = jobId;
    resp["status"]    = statusStr(curStatus);
    resp["updatedAt"] = isoTimestamp();
    sendJsonResponse(200, resp);
    return;
  }

  // Rejeita se já tem job rodando
  if (solverTaskHandle != nullptr) {
    StaticJsonDocument<128> resp;
    resp["jobId"]        = jobId;
    resp["status"]       = "error";
    resp["errorMessage"] = "Máquina ocupada com outro job";
    resp["updatedAt"]    = isoTimestamp();
    sendJsonResponse(409, resp);
    return;
  }

  // Registra job como QUEUED
  xSemaphoreTake(jobMutex, portMAX_DELAY);
  strncpy(currentJob.id, jobId, sizeof(currentJob.id) - 1);
  currentJob.status      = QUEUED;
  currentJob.errorMsg[0] = '\0';
  currentJob.startedAt   = 0;
  xSemaphoreGive(jobMutex);

  // Responde QUEUED imediatamente (antes de criar a task)
  StaticJsonDocument<128> resp;
  resp["jobId"]     = jobId;
  resp["status"]    = "queued";
  resp["updatedAt"] = isoTimestamp();
  sendJsonResponse(200, resp);

  // Monta payload para taskSolver
  SolverPayload* payload = (SolverPayload*)pvPortMalloc(sizeof(SolverPayload));
  if (!payload) {
    setJobStatus(JOB_ERROR, "Sem memória para iniciar solver");
    return;
  }
  strncpy(payload->jobId, jobId, sizeof(payload->jobId) - 1);
  serializeJson(doc["actions"], payload->actionsJson, sizeof(payload->actionsJson));

  // Cria task no Core 1
  BaseType_t created = xTaskCreatePinnedToCore(
    taskSolver, "solver", STACK_SOLVER, payload, 2, &solverTaskHandle, 1
  );
  if (created != pdPASS) {
    vPortFree(payload);
    solverTaskHandle = nullptr;
    setJobStatus(JOB_ERROR, "Falha ao criar task do solver");
  }
}

// GET /status?jobId=x
void handleStatus() {
  if (server.header("X-Device-Secret") != DEVICE_SECRET) {
    StaticJsonDocument<64> err;
    err["error"] = "Unauthorized";
    sendJsonResponse(401, err);
    return;
  }

  String jobId = server.arg("jobId");
  if (jobId.isEmpty()) {
    StaticJsonDocument<64> err;
    err["error"] = "jobId ausente";
    sendJsonResponse(400, err);
    return;
  }

  xSemaphoreTake(jobMutex, portMAX_DELAY);
  bool      found = strcmp(currentJob.id, jobId.c_str()) == 0;
  JobStatus s     = currentJob.status;
  char      errCopy[128];
  strncpy(errCopy, currentJob.errorMsg, sizeof(errCopy) - 1);
  xSemaphoreGive(jobMutex);

  StaticJsonDocument<256> resp;
  resp["jobId"]     = jobId;
  resp["updatedAt"] = isoTimestamp();

  if (!found) {
    resp["status"]       = "error";
    resp["errorMessage"] = "Job não encontrado";
    sendJsonResponse(404, resp);
    return;
  }

  resp["status"] = statusStr(s);
  if (s == JOB_ERROR && strlen(errCopy) > 0) {
    resp["errorMessage"] = errCopy;
  }
  sendJsonResponse(200, resp);
}

// GET /health
void handleHealth() {
  StaticJsonDocument<128> resp;
  resp["ok"]     = true;
  resp["ip"]     = WiFi.localIP().toString();
  resp["uptime"] = millis() / 1000;
  resp["rssi"]   = WiFi.RSSI();
  sendJsonResponse(200, resp);
}

void handleNotFound() {
  StaticJsonDocument<64> err;
  err["error"] = "Rota não encontrada";
  sendJsonResponse(404, err);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK: taskSolver — executa ações mecânicas, se auto-deleta
// ═══════════════════════════════════════════════════════════════════════════════
void taskSolver(void* pv) {
  SolverPayload* payload = (SolverPayload*)pv;
  char jobId[64];
  strncpy(jobId, payload->jobId, sizeof(jobId) - 1);

  StaticJsonDocument<HTTP_BODY_SIZE> actDoc;
  DeserializationError err = deserializeJson(actDoc, payload->actionsJson);
  vPortFree(payload);

  if (err) {
    setJobStatus(JOB_ERROR, "JSON de ações inválido");
    solverTaskHandle = nullptr;
    vTaskDelete(nullptr);
    return;
  }

  // → STARTED
  xSemaphoreTake(jobMutex, portMAX_DELAY);
  currentJob.status    = STARTED;
  currentJob.startedAt = xTaskGetTickCount();
  xSemaphoreGive(jobMutex);

  Serial.printf("[SOLVER] Job %s iniciado\n", jobId);

  JsonArray actions = actDoc.as<JsonArray>();
  for (JsonObject action : actions) {
    const char* type = action["type"] | "?";
    Serial.printf("[SOLVER] Executando: %s\n", type);

    if (!executeAction(action)) {
      char errMsg[128];
      snprintf(errMsg, sizeof(errMsg), "Falha na ação: %s", type);
      setJobStatus(JOB_ERROR, errMsg);
      Serial.printf("[SOLVER] ERRO: %s\n", errMsg);
      solverTaskHandle = nullptr;
      vTaskDelete(nullptr);
      return;
    }
  }

  setJobStatus(FINISHED);
  Serial.printf("[SOLVER] Job %s finalizado com sucesso\n", jobId);
  solverTaskHandle = nullptr;
  vTaskDelete(nullptr);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK: taskLed
// ═══════════════════════════════════════════════════════════════════════════════
void taskLed(void* pv) {
  bool ledState = false;
  for (;;) {
    switch (getJobStatus()) {
      case STARTED:
        ledState = !ledState;
        digitalWrite(LED_STATUS,  ledState);
        digitalWrite(LED_RUNNING, HIGH);
        vTaskDelay(pdMS_TO_TICKS(200));
        break;
      case QUEUED:
        ledState = !ledState;
        digitalWrite(LED_STATUS,  ledState);
        digitalWrite(LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(500));
        break;
      case FINISHED:
        digitalWrite(LED_STATUS,  HIGH);
        digitalWrite(LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(1000));
        break;
      case JOB_ERROR:
        ledState = !ledState;
        digitalWrite(LED_STATUS,  ledState);
        digitalWrite(LED_RUNNING, ledState);
        vTaskDelay(pdMS_TO_TICKS(150));
        break;
      default:
        ledState = !ledState;
        digitalWrite(LED_STATUS,  ledState);
        digitalWrite(LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(1000));
        break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUATORS (mock — substitua pelo hardware real)
// ═══════════════════════════════════════════════════════════════════════════════
bool actuatorHome(JsonObject a) {
  Serial.printf("[ACT] home target=%s\n", (const char*)(a["target"] | "all"));
  vTaskDelay(pdMS_TO_TICKS(300));
  return true;
}
bool actuatorClamp(JsonObject a) {
  Serial.printf("[ACT] clamp name=%s state=%s\n",
    (const char*)(a["name"] | "?"), (const char*)(a["state"] | "?"));
  vTaskDelay(pdMS_TO_TICKS(200));
  return true;
}
bool actuatorTurnFace(JsonObject a) {
  Serial.printf("[ACT] turn_face actuator=%s degrees=%d\n",
    (const char*)(a["actuator"] | "?"), (int)(a["degrees"] | 0));
  vTaskDelay(pdMS_TO_TICKS(200 + abs((int)(a["degrees"] | 0))));
  return true;
}
bool actuatorRotateCube(JsonObject a) {
  Serial.printf("[ACT] rotate_cube axis=%s degrees=%d\n",
    (const char*)(a["axis"] | "?"), (int)(a["degrees"] | 0));
  vTaskDelay(pdMS_TO_TICKS(300 + abs((int)(a["degrees"] | 0))));
  return true;
}
bool actuatorWait(JsonObject a) {
  int ms = a["durationMs"] | a["ms"] | 500;
  Serial.printf("[ACT] wait ms=%d\n", ms);
  vTaskDelay(pdMS_TO_TICKS(ms));
  return true;
}

bool executeAction(JsonObject action) {
  const char* type = action["type"] | "";
  if (strcmp(type, "home")         == 0) return actuatorHome(action);
  if (strcmp(type, "clamp")        == 0) return actuatorClamp(action);
  if (strcmp(type, "turn_face")    == 0) return actuatorTurnFace(action);
  if (strcmp(type, "rotate_cube")  == 0) return actuatorRotateCube(action);
  if (strcmp(type, "wait")         == 0) return actuatorWait(action);
  Serial.printf("[WARN] Ação desconhecida '%s' ignorada\n", type);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
void setJobStatus(JobStatus s, const char* errMsg) {
  xSemaphoreTake(jobMutex, portMAX_DELAY);
  currentJob.status = s;
  if (errMsg) strncpy(currentJob.errorMsg, errMsg, sizeof(currentJob.errorMsg) - 1);
  xSemaphoreGive(jobMutex);
}

JobStatus getJobStatus() {
  xSemaphoreTake(jobMutex, portMAX_DELAY);
  JobStatus s = currentJob.status;
  xSemaphoreGive(jobMutex);
  return s;
}

void sendJsonResponse(int code, JsonDocument& doc) {
  String body;
  serializeJson(doc, body);
  // httpMutex já tomado pelo taskHttp ao chamar handleClient — não tomar de novo
  server.send(code, "application/json", body);
}

const char* statusStr(JobStatus s) {
  switch (s) {
    case QUEUED:    return "queued";
    case STARTED:   return "started";
    case FINISHED:  return "finished";
    case JOB_ERROR: return "error";
    default:        return "idle";
  }
}

String isoTimestamp() {
  // Com Wi-Fi disponível, use NTP para timestamp real:
  // configTime(0, 0, "pool.ntp.org"); → getLocalTime(&timeinfo)
  // Por ora, millis() como fallback:
  unsigned long ms  = millis();
  unsigned long sec = ms / 1000;
  unsigned long min = sec / 60;
  unsigned long hr  = min / 60;
  char buf[32];
  snprintf(buf, sizeof(buf), "1970-01-01T%02lu:%02lu:%02lu.%03luZ",
           hr % 24, min % 60, sec % 60, ms % 1000);
  return String(buf);
}
