#include "battery_monitor.h"

#include <cmath>
#include "adc_service.h"
#include "battery_ina226_service.h"

namespace BatteryMonitor {

namespace {
bool finiteValue(float v) {
  return std::isfinite(v);
}
}

bool begin() {
  return BatteryIna226Service::begin(BatteryIna226Service::kI2cAddress);
}

float batteryVoltageFromNode(float nodeVolts) {
  return nodeVolts * kDividerScale;
}

float batteryCurrentFromShunt(float shuntVolts) {
  return shuntVolts / kShuntOhms;
}

Telemetry read() {
  Telemetry t{};
  bool adcOk = false;
  bool inaAny = false;

  float nodeV = 0.0f;
  if (AdcService::readMuxNodeVolts(kBatteryMuxCoord, nodeV)) {
    const float batteryV = batteryVoltageFromNode(nodeV);
    if (finiteValue(batteryV)) {
      t.voltageV = batteryV;
      t.voltageValid = true;
      adcOk = true;
    }
  }

  BatteryIna226Service::Sample s{};
  if (BatteryIna226Service::sample(s)) {
    if (s.busValid && finiteValue(s.busVolts)) {
      t.inaBusVoltageV = s.busVolts;
      t.inaBusVoltageValid = true;
      inaAny = true;
    }
    if (s.shuntValid && finiteValue(s.shuntVolts)) {
      t.shuntVoltageV = s.shuntVolts;
      t.shuntVoltageValid = true;
      const float currentA = batteryCurrentFromShunt(s.shuntVolts);
      if (finiteValue(currentA)) {
        t.currentA = currentA;
        t.currentValid = true;
        inaAny = true;
      }
    }
  }

  if (t.voltageValid && t.currentValid) {
    const float p = t.voltageV * t.currentA;
    if (finiteValue(p)) {
      t.powerW = p;
      t.powerValid = true;
    }
  }

  if (adcOk && inaAny) t.error = Error::NONE;
  else if (!adcOk && !inaAny) t.error = Error::PARTIAL;
  else if (!adcOk) t.error = Error::ADC_UNAVAILABLE;
  else t.error = Error::INA_UNAVAILABLE;

  return t;
}

} // namespace BatteryMonitor
