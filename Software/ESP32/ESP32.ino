#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

#include "src/config/Config.h"
#include "src/config/DeviceConfig.h"
#include "src/job/JobManager.h"
#include "src/network/Network.h"
#include "src/server/HttpServer.h"
#include "src/actuators/Actuators.h"
#include "src/utils/TimeUtils.h"

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
    AppNetwork::reconnectIfNeeded();
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

static void checkFactoryReset() {
  pinMode(0, INPUT_PULLUP); 
  
  Serial.println("\n[BOOT] Voce tem 2 SEGUNDOS para apertar o botao BOOT e resetar a placa...");
  
  bool resetRequested = false;
  
  for (int i = 0; i < 20; i++) {
    if (digitalRead(0) == LOW) {
      resetRequested = true;
      break;
    }
    delay(100);
  }

  if (resetRequested) {
    Serial.println("\n[RESET] Botão BOOT detectado pressionado!");
    Serial.println("[RESET] Iniciando formatação de fábrica...");
    
    for (int i = 0; i < 15; i++) {
      digitalWrite(PIN_LED_STATUS, HIGH); delay(50);
      digitalWrite(PIN_LED_STATUS, LOW);  delay(50);
    }
    
    DeviceConfig::clear();
    
    Serial.println("[RESET] Placa resetada com sucesso! Reiniciando...\n");
    delay(1000);
    ESP.restart();
  } else {
    Serial.println("[BOOT] Inicializacao normal prosseguindo...\n");
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

  checkFactoryReset();

  JobManager::init();
  DeviceConfig::init();

  if (!DeviceConfig::isProvisioned()) {
    Serial.println("[BOOT] NVS vazia — entrando em modo provisionamento.");
    HttpServer::startProvisioningAP();
    HttpServer::init(server);
    for (;;) {
      HttpServer::handle(server);
      vTaskDelay(pdMS_TO_TICKS(5));
    }
  }

  AppNetwork::connectWiFi();
  AppNetwork::syncNTP();
  AppNetwork::registerDevice();

  HttpServer::init(server);
  createTasks();

  Serial.println("[ESP32] Pronto. Aguardando requisições HTTP.");
}

void loop() {
  vTaskDelay(portMAX_DELAY);
}
