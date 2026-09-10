#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — measurement_conversion.h
// Package 3 measurement-domain conversion layer.
//
// ROLE:
//   AdcService remains RAW ADC -> ADS/node voltage only.
//   This layer owns ADS/node voltage -> engineering-domain conversion.
//
// SAFETY RULES:
//   - No global x11 conversion.
//   - Conversion is channel/family aware.
//   - Missing calibration authority returns PENDING, never a fabricated 0.0V.
//   - CAN _R channels are not exposed as ordinary pin-voltage channels.
// =============================================================================

#include <cstdint>
#include "channels.h"

namespace MeasurementConversion {

enum class MeasurementFamily : uint8_t {
  VEHICLE_DIVIDED = 0,
  GND_SENSE,
  CONNECTOR_CAN,
  CAN_RESISTANCE,
  INVALID
};

enum class ConversionStatus : uint8_t {
  CALIBRATED = 0,
  DERIVED,
  OPEN_CIRCUIT,
  PENDING,
  INVALID
};

enum class CalibrationModel : uint8_t {
  NONE = 0,
  LINEAR
};

struct ChannelCalibration {
  CalibrationModel model;
  float slope;
  float offset;
};

struct CalibrationTable {
  ChannelCalibration channel[Channels::kAdcChannelCount];
};

struct PinVoltage {
  float vPin;
  ConversionStatus status;
  MeasurementFamily family;
};

struct CanResistance {
  float ohms;
  ConversionStatus status;
};

void clearCalibration(CalibrationTable& table);

bool setLinearCalibration(
    CalibrationTable& table,
    Channels::AdcChannel ch,
    float slope,
    float offset);

MeasurementFamily familyFor(Channels::AdcChannel ch);

PinVoltage convertNodeToPin(
    const CalibrationTable& table,
    Channels::AdcChannel ch,
    float vNode);

CanResistance convertCanDeltaToOhms(
    float canHNodeV,
    float canLNodeV,
    float referenceV = 3.3f,
    float referenceOhms = 1500.0f);

} // namespace MeasurementConversion
