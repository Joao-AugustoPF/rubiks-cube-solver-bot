#pragma once

#define WIFI_SSID      "SUA_REDE_WIFI"
#define WIFI_PASSWORD  "SUA_SENHA_WIFI"

#define NEXTJS_REGISTER_URL  "http://cubo.joaoaugustopf.com/api/device/register"
#define DEVICE_ID            "rubik-solver-01"
#define DEVICE_SECRET        "MC48399J3CUJBWTCC62HAJ"

#define PIN_LED_STATUS   2
#define PIN_LED_RUNNING  4

#define STACK_HTTP       6144
#define STACK_SOLVER     8192
#define STACK_LED        1024
#define STACK_WATCHDOG   2048

#define HTTP_SERVER_PORT  80
#define HTTP_BODY_SIZE    8192

#define WIFI_CONNECT_MAX_ATTEMPTS   30
#define WIFI_RECONNECT_MAX_ATTEMPTS 20
#define WIFI_RECONNECT_INTERVAL_MS  10000
#define REGISTER_MAX_ATTEMPTS       5
#define REGISTER_RETRY_DELAY_MS     3000
#define NTP_MAX_ATTEMPTS            10
