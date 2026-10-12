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


// Bench calibration captured on the active REV-2 unit with MASTER_GND
// physically connected for every reference point. Reference inputs:
// 0, 3.3, 12, 18, 24, 30 V. These tables are channel-specific because the
// measured transfer curve is intentionally not treated as an ideal divider.
constexpr uint8_t kBenchPointCount = 6;
constexpr float kBenchReferenceV[kBenchPointCount] = {
    0.0f, 3.3f, 12.0f, 18.0f, 24.0f, 30.0f};

struct BenchCurve {
  AdcChannel ch;
  float node[kBenchPointCount];
};

constexpr BenchCurve kBenchCurves[] = {
  {AdcChannel::MUX_7P_AKU,       {-0.000750f, 0.298250f, 1.051000f, 1.381250f, 1.558875f, 1.673250f}},
  {AdcChannel::MUX_7P_KONTAK,    {-0.000875f, 0.298500f, 1.052500f, 1.382250f, 1.558750f, 1.672375f}},
  {AdcChannel::MUX_7P_ABS,       {-0.000750f, 0.298625f, 1.053125f, 1.384125f, 1.561000f, 1.674875f}},
  {AdcChannel::MUX_7P_CAN_H,     {-0.000750f, 0.294250f, 1.078250f, 1.544500f, 1.803500f, 1.956750f}},
  {AdcChannel::MUX_7P_CAN_L,     {-0.000750f, 0.295625f, 1.081125f, 1.547625f, 1.831250f, 2.000875f}},

  {AdcChannel::MUX_15P_SOL_SINYAL,    {-0.000750f, 0.298250f, 1.051750f, 1.385125f, 1.564250f, 1.679000f}},
  {AdcChannel::MUX_15P_SAG_SINYAL,    {-0.000625f, 0.298250f, 1.050500f, 1.382125f, 1.559875f, 1.674000f}},
  {AdcChannel::MUX_15P_SIS,           {-0.000750f, 0.297875f, 1.049125f, 1.378875f, 1.555500f, 1.669250f}},
  {AdcChannel::MUX_15P_SOL_PARK,      {-0.000750f, 0.298000f, 1.051625f, 1.385375f, 1.564375f, 1.679125f}},
  {AdcChannel::MUX_15P_SAG_PARK,      {-0.000750f, 0.298500f, 1.055750f, 1.388250f, 1.565875f, 1.679750f}},
  {AdcChannel::MUX_15P_STOP,          {-0.000750f, 0.298375f, 1.053250f, 1.385250f, 1.562875f, 1.676750f}},
  {AdcChannel::MUX_15P_GERI,          {-0.000750f, 0.298500f, 1.054375f, 1.386500f, 1.564000f, 1.678000f}},
  {AdcChannel::MUX_15P_AKU,           {-0.000750f, 0.298000f, 1.050125f, 1.383625f, 1.562875f, 1.678000f}},
  {AdcChannel::MUX_15P_BALATA_SINYAL, {-0.000625f, 0.298750f, 1.054000f, 1.383000f, 1.558375f, 1.671250f}},
  {AdcChannel::MUX_15P_YAYLI,         {-0.000750f, 0.298250f, 1.048750f, 1.376125f, 1.552000f, 1.665125f}},
  {AdcChannel::MUX_15P_ASANSOR,       {-0.000750f, 0.297875f, 1.044625f, 1.372375f, 1.548875f, 1.662375f}},
  {AdcChannel::MUX_15P_CAN_H,         {-0.000625f, 0.295500f, 1.080750f, 1.544750f, 1.825875f, 1.994250f}},
  {AdcChannel::MUX_15P_CAN_L,         {-0.000625f, 0.295500f, 1.080875f, 1.548500f, 1.834500f, 2.005750f}},
};

const BenchCurve* benchCurveFor(AdcChannel ch) {
  for (const auto& curve : kBenchCurves) {
    if (curve.ch == ch) return &curve;
  }
  return nullptr;
}

bool interpolateBench(const BenchCurve& curve, float nodeV, float& pinV) {
  if (!finiteValue(nodeV)) return false;

  uint8_t lo = 0;
  if (nodeV <= curve.node[0]) {
    lo = 0;
  } else if (nodeV >= curve.node[kBenchPointCount - 1]) {
    lo = kBenchPointCount - 2;
  } else {
    for (uint8_t i = 0; i < kBenchPointCount - 1; ++i) {
      if (nodeV >= curve.node[i] && nodeV <= curve.node[i + 1]) {
        lo = i;
        break;
      }
    }
  }

  const float x0 = curve.node[lo];
  const float x1 = curve.node[lo + 1];
  const float y0 = kBenchReferenceV[lo];
  const float y1 = kBenchReferenceV[lo + 1];
  const float dx = x1 - x0;
  if (!finiteValue(dx) || dx <= 0.0f) return false;

  pinV = y0 + ((nodeV - x0) * (y1 - y0) / dx);
  return finiteValue(pinV);
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
  if (cal.model == CalibrationModel::LINEAR) {
    const float vPin = (vNode * cal.slope) + cal.offset;
    if (!finiteValue(vPin)) {
      return {0.0f, ConversionStatus::INVALID, family};
    }
    return {vPin, ConversionStatus::CALIBRATED, family};
  }

  // Bench fallback is used only for channels characterized on the active
  // REV-2 hardware. A persisted linear calibration, when present, still wins.
  // GND_SENSE is deliberately excluded: the captured ~1.01 V signature is a
  // known-good MASTER_GND reference, not a voltage-divider transfer curve.
  if (family != MeasurementFamily::GND_SENSE) {
    const BenchCurve* curve = benchCurveFor(ch);
    float benchPinV = 0.0f;
    if (curve != nullptr && interpolateBench(*curve, vNode, benchPinV)) {
      return {benchPinV, ConversionStatus::CALIBRATED, family};
    }
  }

  return {0.0f, ConversionStatus::PENDING, family};
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
  if (delta < 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }

  // With no conductive H-L path, delta tends to the full reference voltage.
  // Recognize the rail before the out-of-range rejection so an exact open
  // circuit (H=Vs, L=0) cannot be confused with invalid data.
  constexpr float kOpenMarginV = 0.001f;
  if (delta <= referenceV && (referenceV - delta) <= kOpenMarginV) {
    return {INFINITY, ConversionStatus::OPEN_CIRCUIT};
  }

  if (delta > referenceV) {
    return {0.0f, ConversionStatus::INVALID};
  }

  const float denominator = referenceV - delta;
  if (denominator <= 0.0f) {
    return {INFINITY, ConversionStatus::OPEN_CIRCUIT};
  }

  const float ohms = (2.0f * referenceOhms * delta) / denominator;
  if (!finiteValue(ohms) || ohms < 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }

  return {ohms, ConversionStatus::DERIVED};
}

CanResistance convertCanHighNodeToOhms(
    float canHNodeV,
    float referenceV,
    float referenceOhms) {
  if (!finiteValue(canHNodeV) || !finiteValue(referenceV) ||
      !finiteValue(referenceOhms) || referenceV <= 0.0f ||
      referenceOhms <= 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }

  // For Vref -> Rref -> H -> Rx -> L -> Rref -> GND:
  // VH = Vref * (Rref + Rx) / (2*Rref + Rx)
  // Rx = Rref * (2*VH - Vref) / (Vref - VH)
  constexpr float kOpenMarginV = 0.001f;
  if (canHNodeV <= referenceV &&
      (referenceV - canHNodeV) <= kOpenMarginV) {
    return {INFINITY, ConversionStatus::OPEN_CIRCUIT};
  }
  if (canHNodeV < (referenceV * 0.5f) || canHNodeV > referenceV) {
    return {0.0f, ConversionStatus::INVALID};
  }

  const float denominator = referenceV - canHNodeV;
  if (denominator <= 0.0f) {
    return {INFINITY, ConversionStatus::OPEN_CIRCUIT};
  }

  const float numerator = referenceOhms * ((2.0f * canHNodeV) - referenceV);
  const float ohms = numerator / denominator;
  if (!finiteValue(ohms) || ohms < 0.0f) {
    return {0.0f, ConversionStatus::INVALID};
  }
  return {ohms, ConversionStatus::DERIVED};
}

} // namespace MeasurementConversion
