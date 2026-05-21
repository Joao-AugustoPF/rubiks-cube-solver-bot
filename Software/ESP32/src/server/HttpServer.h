#pragma once

#include <WebServer.h>

namespace HttpServer {
  void init   (WebServer& server);
  void handle (WebServer& server);
}
