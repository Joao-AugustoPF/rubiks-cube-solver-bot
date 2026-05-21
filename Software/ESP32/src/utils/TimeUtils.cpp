#include "TimeUtils.h"

namespace TimeUtils {

String isoTimestamp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
    return String(buf);
  }

  unsigned long ms = millis();
  char buf[32];
  snprintf(buf, sizeof(buf), "1970-01-01T%02lu:%02lu:%02lu.%03luZ",
           (ms / 3600000) % 24,
           (ms / 60000)   % 60,
           (ms / 1000)    % 60,
            ms            % 1000);
  return String(buf);
}

}
