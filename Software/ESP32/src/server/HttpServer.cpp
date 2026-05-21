#include "HttpServer.h"

#include <ArduinoJson.h>
#include <WiFi.h>
#include "../actuators/Actuators.h"
#include "../config/Config.h"
#include "../config/DeviceConfig.h"
#include "../job/JobManager.h"
#include "../utils/TimeUtils.h"

static void handleStart   (WebServer& server);
static void handleStatus  (WebServer& server);
static void handleHealth  (WebServer& server);
static void handleNotFound(WebServer& server);

struct SolverPayload {
  char jobId      [64];
  char actionsJson[HTTP_BODY_SIZE];
};

static TaskHandle_t _solverTaskHandle = nullptr;

static void taskSolver(void* pv) {
  SolverPayload* payload = (SolverPayload*)pv;

  char jobId[64];
  strncpy(jobId, payload->jobId, sizeof(jobId) - 1);

  StaticJsonDocument<HTTP_BODY_SIZE> actionsDoc;
  DeserializationError parseError = deserializeJson(actionsDoc, payload->actionsJson);
  vPortFree(payload);

  if (parseError) {
    JobManager::setError("JSON de ações inválido");
    _solverTaskHandle = nullptr;
    vTaskDelete(nullptr);
    return;
  }

  JobManager::setStarted(jobId);
  Serial.printf("[SOLVER] Job %s iniciado\n", jobId);

  for (JsonObject action : actionsDoc.as<JsonArray>()) {
    const char* type = action["type"] | "?";
    Serial.printf("[SOLVER] Executando: %s\n", type);

    if (!Actuators::execute(action)) {
      char errMsg[128];
      snprintf(errMsg, sizeof(errMsg), "Falha na ação: %s", type);
      JobManager::setError(errMsg);
      Serial.printf("[SOLVER] ERRO: %s\n", errMsg);
      _solverTaskHandle = nullptr;
      vTaskDelete(nullptr);
      return;
    }
  }

  JobManager::setFinished();
  Serial.printf("[SOLVER] Job %s finalizado com sucesso\n", jobId);
  _solverTaskHandle = nullptr;
  vTaskDelete(nullptr);
}

static bool isAuthorized(WebServer& server) {
  return server.header("X-Device-Secret") == DeviceConfig::getSecret();
}

static void sendJson(WebServer& server, int code, JsonDocument& doc) {
  String body;
  serializeJson(doc, body);
  server.send(code, "application/json", body);
}

static void sendError(WebServer& server, int code, const char* message) {
  StaticJsonDocument<128> err;
  err["error"] = message;
  sendJson(server, code, err);
}

static void handleStart(WebServer& server) {
  if (!isAuthorized(server)) {
    sendError(server, 401, "Unauthorized");
    return;
  }

  if (!server.hasArg("plain") || server.arg("plain").isEmpty()) {
    sendError(server, 400, "Body vazio");
    return;
  }

  StaticJsonDocument<HTTP_BODY_SIZE> doc;
  DeserializationError parseError = deserializeJson(doc, server.arg("plain"));
  if (parseError) {
    StaticJsonDocument<128> err;
    err["error"]  = "JSON inválido";
    err["detail"] = parseError.c_str();
    sendJson(server, 400, err);
    return;
  }

  const char* jobId = doc["jobId"] | "";
  if (strlen(jobId) == 0) {
    sendError(server, 400, "jobId ausente");
    return;
  }

  if (JobManager::isBusyWith(jobId)) {
    Job snap; JobManager::getSnapshot(snap);
    StaticJsonDocument<128> resp;
    resp["jobId"]     = jobId;
    resp["status"]    = JobManager::statusToString(snap.status);
    resp["updatedAt"] = TimeUtils::isoTimestamp();
    sendJson(server, 200, resp);
    return;
  }

  if (_solverTaskHandle != nullptr) {
    StaticJsonDocument<128> resp;
    resp["jobId"]        = jobId;
    resp["status"]       = "error";
    resp["errorMessage"] = "Máquina ocupada com outro job";
    resp["updatedAt"]    = TimeUtils::isoTimestamp();
    sendJson(server, 409, resp);
    return;
  }

  JobManager::setQueued(jobId);

  StaticJsonDocument<128> resp;
  resp["jobId"]     = jobId;
  resp["status"]    = "queued";
  resp["updatedAt"] = TimeUtils::isoTimestamp();
  sendJson(server, 200, resp);

  SolverPayload* payload = (SolverPayload*)pvPortMalloc(sizeof(SolverPayload));
  if (!payload) {
    JobManager::setError("Sem memória para iniciar solver");
    return;
  }

  strncpy(payload->jobId, jobId, sizeof(payload->jobId) - 1);
  serializeJson(doc["actions"], payload->actionsJson, sizeof(payload->actionsJson));

  BaseType_t created = xTaskCreatePinnedToCore(
    taskSolver, "solver", STACK_SOLVER, payload, 2, &_solverTaskHandle, 1
  );
  if (created != pdPASS) {
    vPortFree(payload);
    _solverTaskHandle = nullptr;
    JobManager::setError("Falha ao criar task do solver");
  }
}

static void handleStatus(WebServer& server) {
  if (!isAuthorized(server)) {
    sendError(server, 401, "Unauthorized");
    return;
  }

  String jobId = server.arg("jobId");
  if (jobId.isEmpty()) {
    sendError(server, 400, "jobId ausente");
    return;
  }

  Job snap;
  JobManager::getSnapshot(snap);

  StaticJsonDocument<256> resp;
  resp["jobId"]     = jobId;
  resp["updatedAt"] = TimeUtils::isoTimestamp();

  if (strcmp(snap.id, jobId.c_str()) != 0) {
    resp["status"]       = "error";
    resp["errorMessage"] = "Job não encontrado";
    sendJson(server, 404, resp);
    return;
  }

  resp["status"] = JobManager::statusToString(snap.status);
  if (snap.status == JobStatus::ERROR && strlen(snap.errorMessage) > 0) {
    resp["errorMessage"] = snap.errorMessage;
  }
  sendJson(server, 200, resp);
}

static void handleHealth(WebServer& server) {
  StaticJsonDocument<128> resp;
  resp["ok"]     = true;
  resp["ip"]     = WiFi.localIP().toString();
  resp["uptime"] = millis() / 1000;
  resp["rssi"]   = WiFi.RSSI();
  sendJson(server, 200, resp);
}

static void handleNotFound(WebServer& server) {
  sendError(server, 404, "Rota não encontrada");
}

static void handleProvision(WebServer& server) {
  if (!server.hasArg("plain") || server.arg("plain").isEmpty()) {
    sendError(server, 400, "Body vazio");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError parseError = deserializeJson(doc, server.arg("plain"));
  if (parseError) {
    sendError(server, 400, "JSON inválido");
    return;
  }

  String wifiSsid     = doc["wifiSsid"]     | "";
  String wifiPassword = doc["wifiPassword"] | "";
  String secret       = doc["secret"]       | "";
  String deviceId     = doc["deviceId"]     | "";

  if (!DeviceConfig::provision(wifiSsid, wifiPassword, secret, deviceId)) {
    sendError(server, 400, "Campos obrigatórios ausentes: wifiSsid, wifiPassword, secret");
    return;
  }

  StaticJsonDocument<128> resp;
  resp["ok"]      = true;
  resp["message"] = "Provisionado. Reiniciando em 2s...";
  sendJson(server, 200, resp);

  delay(2000);
  ESP.restart();
}

namespace HttpServer {

void startProvisioningAP() {
  WiFi.softAP(PROVISION_AP_SSID, *PROVISION_AP_PASSWORD ? PROVISION_AP_PASSWORD : nullptr);
  Serial.printf("[AP] Modo provisionamento ativo. SSID: %s  IP: %s\n",
                PROVISION_AP_SSID, WiFi.softAPIP().toString().c_str());
}

void init(WebServer& server) {
  server.on("/provision", HTTP_POST, [&]() { handleProvision(server); });
  server.on("/start",     HTTP_POST, [&]() { handleStart(server);     });
  server.on("/status",    HTTP_GET,  [&]() { handleStatus(server);    });
  server.on("/health",    HTTP_GET,  [&]() { handleHealth(server);    });
  server.onNotFound(                 [&]() { handleNotFound(server);  });

  const char* headersToCollect[] = { "X-Device-Secret", "Content-Type" };
  server.collectHeaders(headersToCollect, 2);
  server.begin();

  Serial.printf("[HTTP] Servidor iniciado na porta %d\n", HTTP_SERVER_PORT);
}

void handle(WebServer& server) {
  server.handleClient();
}

}
