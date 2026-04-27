#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

#include "config/Config.h"
#include "config/DeviceConfig.h"
#include "job/JobManager.h"
#include "network/Network.h"
#include "server/HttpServer.h"
#include "actuators/Actuators.h"
#include "utils/TimeUtils.h"

static WebServer server(HTTP_SERVER_PORT);

static void taskHttp(void*) {
  for (;;) {
    HttpServer::handle(server);
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

static void taskLed(void*) {
  bool ledState = false;

  for (;;) {
    switch (JobManager::getStatus()) {

      case JobStatus::STARTED:
        ledState = !ledState;
        digitalWrite(PIN_LED_STATUS,  ledState);
        digitalWrite(PIN_LED_RUNNING, HIGH);
        vTaskDelay(pdMS_TO_TICKS(200));
        break;

      case JobStatus::QUEUED:
        ledState = !ledState;
        digitalWrite(PIN_LED_STATUS,  ledState);
        digitalWrite(PIN_LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(500));
        break;

      case JobStatus::FINISHED:
        digitalWrite(PIN_LED_STATUS,  HIGH);
        digitalWrite(PIN_LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(1000));
        break;

      case JobStatus::ERROR:
        ledState = !ledState;
        digitalWrite(PIN_LED_STATUS,  ledState);
        digitalWrite(PIN_LED_RUNNING, ledState);
        vTaskDelay(pdMS_TO_TICKS(150));
        break;

      default:
        ledState = !ledState;
        digitalWrite(PIN_LED_STATUS,  ledState);
        digitalWrite(PIN_LED_RUNNING, LOW);
        vTaskDelay(pdMS_TO_TICKS(1000));
        break;
    }
  }
}

static void taskWatchdog(void*) {
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(WIFI_RECONNECT_INTERVAL_MS));
    Network::reconnectIfNeeded();
  }
}

static void initPins() {
  pinMode(PIN_LED_STATUS,  OUTPUT);
  pinMode(PIN_LED_RUNNING, OUTPUT);
}

static void blinkBootSequence() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(PIN_LED_STATUS, HIGH); delay(80);
    digitalWrite(PIN_LED_STATUS, LOW);  delay(80);
  }
}

static void createTasks() {
  xTaskCreatePinnedToCore(taskHttp,     "http",     STACK_HTTP,     nullptr, 4, nullptr, 0);
  xTaskCreatePinnedToCore(taskLed,      "led",      STACK_LED,      nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(taskWatchdog, "watchdog", STACK_WATCHDOG, nullptr, 2, nullptr, 0);
}

void setup() {
  Serial.begin(115200);

  initPins();
  blinkBootSequence();

  JobManager::init();
  DeviceConfig::init();

  if (!DeviceConfig::isProvisioned()) {
    Serial.println("[BOOT] NVS vazia — entrando em modo provisionamento.");
    HttpServer::startProvisioningAP(server);
    HttpServer::init(server);
    for (;;) {
      HttpServer::handle(server);
      vTaskDelay(pdMS_TO_TICKS(5));
    }
  }

  Network::connectWiFi();
  Network::syncNTP();
  Network::registerDevice();

  HttpServer::init(server);
  createTasks();

  Serial.println("[ESP32] Pronto. Aguardando requisições HTTP.");
}

void loop() {
  vTaskDelay(portMAX_DELAY); // Tudo é gerenciado pelo FreeRTOS
}
