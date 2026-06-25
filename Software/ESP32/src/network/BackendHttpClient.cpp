#include "BackendHttpClient.h"

namespace BackendHttpClient {

static bool isHttpsUrl(const String& url) {
  return url.startsWith("https://");
}

bool begin(HTTPClient& http,
           WiFiClient& plainClient,
           WiFiClientSecure& secureClient,
           const String& url) {
  if (isHttpsUrl(url)) {
    // The production backend uses HTTPS. The ESP32 does not ship with a CA
    // store, so certificate pinning/CA validation can be added later here.
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }

  return http.begin(plainClient, url);
}

}
