#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>

// Standalone display host. Does not include diagnostic firmware or touch GPIO.
WebServer server(80);
const char* ssid = "BREMSECU-EKRAN-TEST";
const char* password = "bremsecu-test";

String mimeFor(const String& path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
  return "application/octet-stream";
}
void serveFile() {
  String path = server.uri();
  if (server.method() != HTTP_GET) { server.send(405, "text/plain", "Screen-test host: no hardware commands"); return; }
  if (path.startsWith("/api/") || path.startsWith("/ws")) { server.send(501, "application/json", "{\"error\":\"SCREEN_TEST_ONLY\"}"); return; }
  if (path.indexOf("..") >= 0 || path.indexOf('\\') >= 0) { server.send(400, "text/plain", "Invalid path"); return; }
  if (path == "/") path = "/index.html";
  File file = LittleFS.open(path, "r");
  if (!file || file.isDirectory()) { server.send(404, "text/plain", "Screen-test asset missing"); return; }
  server.sendHeader("Cache-Control", "no-store");
  server.streamFile(file, mimeFor(path));
  file.close();
}
void setup() {
  Serial.begin(115200);
  // Never auto-format: a missing filesystem needs uploadfs, not data deletion.
  if (!LittleFS.begin(false, "/littlefs", 10, "littlefs")) { Serial.println("LittleFS missing: upload filesystem image"); }
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  server.onNotFound(serveFile);
  server.begin();
  Serial.println("BREMSECU SCREEN TEST ONLY — no real measurements");
  Serial.print("Wi-Fi: "); Serial.println(ssid);
  Serial.print("Open http://"); Serial.println(WiFi.softAPIP());
}
void loop() { server.handleClient(); delay(2); }
