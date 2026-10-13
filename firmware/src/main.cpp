// =============================================================================
// BREMSECU G1 REV-2 — main.cpp
// Boot + loop wiring. Storage/calibration absence is non-fatal to boot, but
// calibration-dependent diagnosis remains explicitly unavailable until valid.
// Loop order: ResultSession::poll() runs AFTER TestEngine::step() so the
// session observes the engine state produced by the current tick.
// =============================================================================
#include <Arduino.h>
#include <Wire.h>
#include "pins.h"
#include "config.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "ground_assist.h"
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
#include "calibration_store.h"
#include "calibration_runtime.h"
#include "network_service.h"
#include "api_server.h"
#include "ws_server.h"

void setup(){
  // External GND-assist relays are low-trigger. Establish the released
  // open-drain/high-impedance state before Serial, delays, I2C, TPIC or any
  // runtime service starts.
  GroundAssist::begin();

  Serial.begin(115200);
  delay(100);
  Wire.begin(Pins::I2C_SDA,Pins::I2C_SCL);

  // Safety state is established before any diagnostic/runtime service.
  TpicControl::begin();
  SafetyInterlocks::begin();

  AdcService::begin();
  PulseMonitor::begin();
  const bool ina226Ready = Ina226Service::begin();
  if (ina226Ready) {
    // REV-2 installed shunt is R010 = 10 mOhm (accepted Package-8 hardware
    // authority). 1 mA current LSB gives a 32.767 A register range and is
    // sufficient for lamp bring-up measurements.
    Ina226Service::applyCalibration(10000u, 1000u);
  }
  RtcService::begin();
  SdService::begin();
  RecordStore::begin();
  ResultSession::begin();
  TestResultStore::begin();
  SettingsStore::begin();

  // CalibrationStore owns persistence only. CalibrationRuntime owns payload
  // interpretation and exposes validated conversion state to TestEngine.
  CalibrationStore::begin();
  CalibrationRuntime::begin();

  TestEngine::TestEngineConfig engineCfg;
  // PROVISIONAL meeting/bench value for lamp bring-up only. Normal 24 V
  // trailer lamps are well below this level; production characterization will
  // replace it after the lamp paths are proven end-to-end.
  engineCfg.loadOvercurrentMaxA = 3.0f;
  TestEngine::begin(engineCfg);

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
