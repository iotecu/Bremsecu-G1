// =============================================================================
// BREMSECU G1 REV-2 — main.cpp
// Boot + loop wiring. Dependency order: I2C -> safety/TPIC -> test engine ->
// evidence services -> RTC -> SD -> RecordStore -> network -> HTTP -> WS.
// Storage failure is NON-fatal: diagnostics continue; record API returns
// STORAGE_ERROR until storage is ready. No hardware shutdown on SD failure.
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
  delay(1);
}