// =============================================================================
// BREMSECU G1 REV-2 — main.cpp
// Boot + loop wiring. Storage failure is NON-fatal to diagnostics.
// Loop order: ResultSession::poll() runs AFTER TestEngine::step() so the
// session observes the engine state produced by the current tick.
// =============================================================================
#include <Arduino.h>
#include <Wire.h>
#include "pins.h"
#include "config.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "test_engine.h"
#include "adc_service.h"
#include "pulse_monitor.h"
#include "ina226_service.h"
#include "rtc_service.h"
#include "sd_service.h"
#include "record_store.h"
#include "result_session.h"
#include "test_result_store.h"
#include "settings_store.h"
#include "network_service.h"
#include "api_server.h"
#include "ws_server.h"

void setup(){
  Serial.begin(115200);
  delay(100);
  Wire.begin(Pins::I2C_SDA,Pins::I2C_SCL);
  TpicControl::begin();
  SafetyInterlocks::begin();
  TestEngine::begin();
  AdcService::begin();
  PulseMonitor::begin();
  Ina226Service::begin();
  RtcService::begin();
  SdService::begin();
  RecordStore::begin();
  ResultSession::begin();
  TestResultStore::begin();
  SettingsStore::begin();  // after SD is available; failure is non-fatal
  NetworkService::NetworkConfig netCfg;
  NetworkService::begin(netCfg);
  ApiServer::begin();
  WsServer::begin();
  Serial.println("BREMSECU G1 REV-2 firmware scaffold ready");
}

void loop(){
  NetworkService::poll();
  ApiServer::poll();
  WsServer::poll();
  TestEngine::step();
  ResultSession::poll();
  delay(1);
}