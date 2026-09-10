#include "measurement_conversion.h"

#include <cmath>

namespace {

using Channels::AdcChannel;
using MeasurementConversion::CalibrationModel;
using MeasurementConversion::ConversionStatus;
using MeasurementConversion::MeasurementFamily;

constexpr bool finiteValue(float v) {
  return v == v && v != INFINITY && v != -INFINITY;
}

bool isCanResistanceChannel(AdcChannel ch) {
  return ch == AdcChannel::MUX_CANH_1_R ||
         ch == AdcChannel::MUX_CANL_1_R ||
         ch == AdcChannel::MUX_CANH_2_R ||
         ch == AdcChannel::MUX_CANL_2_R;
}

bool isGroundSenseChannel(AdcChannel ch) {
  return ch == AdcChannel::MUX_7P_GND1 ||
         ch == AdcChannel::MUX_7P_GND2 ||
         ch == AdcChannel::MUX_15P_GND3 ||
         ch == AdcChannel::MUX_15P_GND4;
}

bool isConnectorCanChannel(AdcChannel ch) {
  return ch == AdcChannel::MUX_7P_CAN_H ||
         ch == AdcChannel::MUX_7P_CAN_L ||
         ch == AdcChannel::MUX_15P_CAN_H ||
         ch == AdcChannel::MUX_15P_CAN_L;
}

}

namespace MeasurementConversion {

void clearCalibration(CalibrationTable& table) {
  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) {
    table.channel[i].model = CalibrationModel::NONE;
    table.channel[i].slope = 0.0f;
    table.channel[i].offset = 0.0f;
  }
}

bool setLinearCalibration(
    CalibrationTable& table,
    Channels::AdcChannel ch,
    float slope,
    float offset) {
  if (!Channels::isValidDiagnosticChannel(ch)) return false;
  if (!finiteValue(slope) || !finiteValue(offset)) return false;

  const uint8_t index = static_cast<uint8_t>(ch);
  table.channel[index].model = CalibrationModel::LINEAR;
  table.channel[index].slope = slope;
  table.channel[index].offset = offset;
  return true;
}

MeasurementFamily familyFor(Channels::AdcChannel ch) {
  if (!Channels::isValidDiagnosticChannel(ch)) return MeasurementFamily::INVALID;
  if (isCanResistanceChannel(ch)) return MeasurementFamily::CAN_RESISTANCE;
  if (isGroundSenseChannel(ch)) return MeasurementFamily::GND_SENSE;
  if (isConnectorCanChannel(ch)) return MeasurementFamily::CONNECTOR_CAN;
  return MeasurementFamily::VEHICLE_DIVIDED;
}

PinVoltage convertNodeToPin(
    const CalibrationTable& table,
    Channels::AdcChannel ch,
    float vNode) {
  const MeasurementFamily family = familyFor(ch);

  if (family == MeasurementFamily::INVALID || !finiteValue(vNode)) {
    return {0.0f, ConversionStatus::INVALID, family};
  }

  if (family == MeasurementFamily::CAN_RESISTANCE) {
    return {0.0f, ConversionStatus::INVALID, family};
  }

  const ChannelCalibration& cal = table.channel[static_cast<uint8_t>(ch)];
  if (cal.model != CalibrationModel::LINEAR) {
    return {0.0f, ConversionStatus::PENDING, family};
  }

  const float vPin = (vNode * cal.slope) + cal.offset;
  if (!finiteValue(vPin)) {
    return {0.0f, ConversionStatus::INVALID, family};
  }

  return {vPin, ConversionStatus::CALIBRATED, family};
}

CanResistance convertCanDeltaToOhms(
    float canHNodeV,
    float canLNodeV,
    float referenceV,
    float referenceOhms) {
  if (!finiteValue(canHNodeV) || !finiteValue(canLNodeV) ||
      !finiteValue(referenceV) || !finiteValue(referenceOhms) ||
      referenceV <= 0.0f || referenceOhms <= 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }

  const float delta = canHNodeV - canLNodeV;
  if (delta < 0.0f || delta >= referenceV) {
    return {0.0f, ConversionStatus::INVALID};
  }

  // With no conductive H-L path, delta tends to the full reference voltage.
  // Treat values effectively at the rail as open rather than returning an
  // unbounded resistance.
  constexpr float kOpenMarginV = 0.001f;
  if ((referenceV - delta) <= kOpenMarginV) {
    return {INFINITY, ConversionStatus::OPEN_CIRCUIT};
  }

  const float ohms = (2.0f * referenceOhms * delta) / (referenceV - delta);
  if (!finiteValue(ohms) || ohms < 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }

  return {ohms, ConversionStatus::DERIVED};
}

} // namespace MeasurementConversion
