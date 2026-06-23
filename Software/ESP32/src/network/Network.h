#pragma once

namespace AppNetwork {
  void connectWiFi();
  void syncNTP();
  bool registerDevice();
  void reconnectIfNeeded();
}
