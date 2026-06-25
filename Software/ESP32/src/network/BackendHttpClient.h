#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

namespace BackendHttpClient {

bool begin(HTTPClient& http,
           WiFiClient& plainClient,
           WiFiClientSecure& secureClient,
           const String& url);

}
