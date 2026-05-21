#pragma once

#include <ArduinoJson.h>

namespace Actuators {
  bool home       (JsonObject action);
  bool clamp      (JsonObject action);
  bool turnFace   (JsonObject action);
  bool rotateCube (JsonObject action);
  bool wait       (JsonObject action);

  bool execute    (JsonObject action);
}
