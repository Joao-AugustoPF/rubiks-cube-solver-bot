#include "Network.h"

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "../config/Config.h"

namespace Network {

void connectWiFi() {
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_CONNECT_MAX_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[WiFi] FALHA na conexão. Reiniciando em 5s...");
    delay(5000);
    ESP.restart();
  }

  Serial.printf("\n[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
}

void syncNTP() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("[NTP] Sincronizando horário");

  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < NTP_MAX_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println(attempts < NTP_MAX_ATTEMPTS ? " OK" : " FALHOU (usando millis)");
}

static bool postRegistration() {
  HTTPClient http;
  http.begin(NEXTJS_REGISTER_URL);
  http.addHeader("Content-Type",    "application/json");
  http.addHeader("X-Device-Secret", DEVICE_SECRET);

  StaticJsonDocument<128> body;
  body["ip"]       = WiFi.localIP().toString();
  body["deviceId"] = DEVICE_ID;

  String bodyStr;
  serializeJson(body, bodyStr);

  int  code = http.POST(bodyStr);
  bool ok   = (code == 200 || code == 201);
  Serial.printf("[REG] POST %s → HTTP %d%s\n", NEXTJS_REGISTER_URL, code, ok ? " OK" : " ERRO");

  http.end();
  return ok;
}

bool registerDevice() {
  for (int attempt = 1; attempt <= REGISTER_MAX_ATTEMPTS; attempt++) {
    if (postRegistration()) return true;
    Serial.printf("[REG] Tentativa %d falhou, aguardando %dms...\n",
                  attempt, REGISTER_RETRY_DELAY_MS);
    delay(REGISTER_RETRY_DELAY_MS);
  }
  Serial.println("[REG] AVISO: Não foi possível registrar no backend. Continuando...");
  return false;
}

void reconnectIfNeeded() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("[WiFi] Conexão perdida. Reconectando...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_RECONNECT_MAX_ATTEMPTS) {
    vTaskDelay(pdMS_TO_TICKS(500));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Reconectado! IP: %s\n", WiFi.localIP().toString().c_str());
    registerDevice();
  } else {
    Serial.println("[WiFi] Falha ao reconectar.");
  }
}

}
