#pragma once

#include <Arduino.h>

namespace DeviceConfig {

  void init();

  bool isProvisioned();

  bool provision(const String& wifiSsid,
                 const String& wifiPassword,
                 const String& secret,
                 const String& deviceId);

  void clear();

  String getWifiSsid();
  String getWifiPassword();
  String getSecret();
  String getDeviceId();
}
