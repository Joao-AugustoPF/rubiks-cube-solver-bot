#pragma once

#include <WebServer.h>

namespace HttpServer {
  void startProvisioningAP();
  void init   (WebServer& server);
  void handle (WebServer& server);
}
