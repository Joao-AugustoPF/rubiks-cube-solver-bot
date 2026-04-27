#include "DeviceConfig.h"
#include <Preferences.h>

static const char* NVS_NAMESPACE  = "device";
static const char* KEY_WIFI_SSID  = "wifi_ssid";
static const char* KEY_WIFI_PASS  = "wifi_pass";
static const char* KEY_SECRET     = "secret";
static const char* KEY_DEVICE_ID  = "device_id";

static String _wifiSsid;
static String _wifiPassword;
static String _secret;
static String _deviceId;

static void loadFromNVS() {
  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, /*readOnly=*/true);
  _wifiSsid     = prefs.getString(KEY_WIFI_SSID, "");
  _wifiPassword = prefs.getString(KEY_WIFI_PASS, "");
  _secret       = prefs.getString(KEY_SECRET,    "");
  _deviceId     = prefs.getString(KEY_DEVICE_ID, "rubik-solver-01");
  prefs.end();
}

namespace DeviceConfig {

void init() {
  loadFromNVS();
  Serial.printf("[CFG] DeviceConfig carregado. Provisionado: %s\n",
                isProvisioned() ? "SIM" : "NÃO");
}

bool isProvisioned() {
  return !_wifiSsid.isEmpty() && !_wifiPassword.isEmpty() && !_secret.isEmpty();
}

bool provision(const String& wifiSsid,
               const String& wifiPassword,
               const String& secret,
               const String& deviceId) {
  if (wifiSsid.isEmpty() || wifiPassword.isEmpty() || secret.isEmpty()) {
    Serial.println("[CFG] Provisionamento falhou: campos obrigatórios ausentes");
    return false;
  }

  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putString(KEY_WIFI_SSID, wifiSsid);
  prefs.putString(KEY_WIFI_PASS, wifiPassword);
  prefs.putString(KEY_SECRET,    secret);
  prefs.putString(KEY_DEVICE_ID, deviceId.isEmpty() ? "rubik-solver-01" : deviceId);
  prefs.end();

  loadFromNVS();
  Serial.println("[CFG] Dispositivo provisionado com sucesso");
  return true;
}

void clear() {
  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, false);
  prefs.clear();
  prefs.end();

  _wifiSsid.clear();
  _wifiPassword.clear();
  _secret.clear();
  _deviceId.clear();

  Serial.println("[CFG] Configurações apagadas (reset de fábrica)");
}

String getWifiSsid()     { return _wifiSsid;     }
String getWifiPassword() { return _wifiPassword; }
String getSecret()       { return _secret;       }
String getDeviceId()     { return _deviceId;     }

}
