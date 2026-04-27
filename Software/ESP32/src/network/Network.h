#pragma once

namespace Network {
  void connectWiFi();
  void syncNTP();
  bool registerDevice();
  void reconnectIfNeeded();
}
