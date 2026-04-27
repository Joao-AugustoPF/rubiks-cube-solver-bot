#include "Actuators.h"

#include <Arduino.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

namespace Actuators {

static void delayMs(int ms) {
  vTaskDelay(pdMS_TO_TICKS(ms));
}

bool home(JsonObject action) {
  const char* target = action["target"] | "all";
  Serial.printf("[ACT] home → target=%s\n", target);
  delayMs(300);
  return true;
}

bool clamp(JsonObject action) {
  const char* name  = action["name"]  | "?";
  const char* state = action["state"] | "?";
  Serial.printf("[ACT] clamp → name=%s state=%s\n", name, state);
  delayMs(200);
  return true;
}

bool turnFace(JsonObject action) {
  const char* actuator = action["actuator"] | "?";
  int degrees          = action["degrees"]  | 0;
  Serial.printf("[ACT] turn_face → actuator=%s degrees=%d\n", actuator, degrees);
  delayMs(200 + abs(degrees));
  return true;
}

bool rotateCube(JsonObject action) {
  const char* axis = action["axis"]    | "?";
  int degrees      = action["degrees"] | 0;
  Serial.printf("[ACT] rotate_cube → axis=%s degrees=%d\n", axis, degrees);
  delayMs(300 + abs(degrees));
  return true;
}

bool wait(JsonObject action) {
  int ms = action["durationMs"] | action["ms"] | 500;
  Serial.printf("[ACT] wait → ms=%d\n", ms);
  delayMs(ms);
  return true;
}

bool execute(JsonObject action) {
  const char* type = action["type"] | "";

  if (strcmp(type, "home")        == 0) return home(action);
  if (strcmp(type, "clamp")       == 0) return clamp(action);
  if (strcmp(type, "turn_face")   == 0) return turnFace(action);
  if (strcmp(type, "rotate_cube") == 0) return rotateCube(action);
  if (strcmp(type, "wait")        == 0) return wait(action);

  Serial.printf("[WARN] Ação desconhecida '%s' ignorada\n", type);
  return true;
}

}
