#include "RemoteJobClient.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "../actuators/Actuators.h"
#include "../config/Config.h"
#include "../config/DeviceConfig.h"
#include "JobManager.h"

namespace RemoteJobClient {

static bool isMachineBusy() {
  JobStatus status = JobManager::getStatus();
  return status == JobStatus::QUEUED || status == JobStatus::STARTED;
}

static void addDeviceHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Secret", DeviceConfig::getSecret());
  http.addHeader("X-Device-IP", WiFi.localIP().toString());
}

static bool postStatus(const char* jobId,
                       const char* status,
                       uint16_t currentActionIndex,
                       uint16_t completedActions,
                       uint16_t totalActions,
                       const char* currentActionType,
                       const char* errorMessage = nullptr) {
  HTTPClient http;
  http.begin(NEXTJS_JOB_STATUS_URL);
  addDeviceHeaders(http);

  StaticJsonDocument<512> body;
  body["deviceId"] = DeviceConfig::getDeviceId();
  body["jobId"]    = jobId;
  body["status"]   = status;
  if (errorMessage && strlen(errorMessage) > 0) {
    body["errorMessage"] = errorMessage;
  }

  JsonObject progress = body.createNestedObject("progress");
  progress["currentActionIndex"] = currentActionIndex;
  progress["completedActions"]   = completedActions;
  progress["totalActions"]       = totalActions;
  progress["currentActionType"]  = currentActionType ? currentActionType : "";

  String bodyStr;
  serializeJson(body, bodyStr);

  int code = http.POST(bodyStr);
  bool ok = code >= 200 && code < 300;
  Serial.printf("[REMOTE] POST status %s job=%s HTTP %d%s\n",
                status, jobId, code, ok ? " OK" : " ERRO");
  http.end();
  return ok;
}

static void executeJob(JsonObject job) {
  const char* jobId = job["jobId"] | "";
  const char* notation = job["notation"] | "";
  JsonArray actions = job["actions"].as<JsonArray>();

  if (strlen(jobId) == 0 || actions.isNull()) {
    Serial.println("[REMOTE] Job inválido recebido do backend");
    return;
  }

  const uint16_t totalActions = actions.size();
  Serial.printf("[REMOTE] Job %s recebido. Notação: %s. Ações: %u\n",
                jobId, notation, totalActions);

  JobManager::setStarted(jobId, totalActions);
  postStatus(jobId, "started", 0, 0, totalActions,
             totalActions > 0 ? (actions[0]["type"] | "") : "");

  uint16_t actionIndex = 0;
  for (JsonObject action : actions) {
    const char* type = action["type"] | "?";
    JobManager::setActionProgress(actionIndex, actionIndex, type);
    postStatus(jobId, "started", actionIndex, actionIndex, totalActions, type);

    Serial.printf("[REMOTE] Executando ação %u/%u: %s\n",
                  actionIndex + 1, totalActions, type);

    if (!Actuators::execute(action)) {
      char errMsg[128];
      snprintf(errMsg, sizeof(errMsg), "Falha na ação: %s", type);
      JobManager::setError(errMsg);
      postStatus(jobId, "error", actionIndex, actionIndex, totalActions, type, errMsg);
      Serial.printf("[REMOTE] ERRO: %s\n", errMsg);
      return;
    }

    actionIndex++;
    uint16_t currentIndexAfter =
      actionIndex >= totalActions ? totalActions - 1 : actionIndex;
    JobManager::setActionProgress(
      totalActions == 0 ? 0 : currentIndexAfter,
      actionIndex,
      type
    );
    postStatus(
      jobId,
      "started",
      totalActions == 0 ? 0 : currentIndexAfter,
      actionIndex,
      totalActions,
      type
    );
  }

  JobManager::setFinished();
  postStatus(
    jobId,
    "finished",
    totalActions == 0 ? 0 : totalActions - 1,
    totalActions,
    totalActions,
    totalActions == 0 ? "" : (actions[totalActions - 1]["type"] | "")
  );
  Serial.printf("[REMOTE] Job %s finalizado\n", jobId);
}

void pollOnce() {
  if (WiFi.status() != WL_CONNECTED || isMachineBusy()) {
    return;
  }

  String url = String(NEXTJS_JOB_NEXT_URL) +
               "?deviceId=" +
               DeviceConfig::getDeviceId();

  HTTPClient http;
  http.begin(url);
  addDeviceHeaders(http);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[REMOTE] GET next HTTP %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  StaticJsonDocument<HTTP_BODY_SIZE> doc;
  DeserializationError parseError = deserializeJson(doc, payload);
  if (parseError) {
    Serial.printf("[REMOTE] JSON inválido em next: %s\n", parseError.c_str());
    return;
  }

  bool hasJob = doc["hasJob"] | false;
  if (!hasJob) {
    return;
  }

  JsonObject job = doc["job"].as<JsonObject>();
  if (job.isNull()) {
    Serial.println("[REMOTE] Resposta hasJob sem objeto job");
    return;
  }

  executeJob(job);
}

}
