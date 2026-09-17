#include <cmath>
#include <cstdio>
#include <cstdlib>

#include "measurement_conversion.h"

namespace {

int gTests = 0;
int gPassed = 0;
int gAssertions = 0;
const char* gCurrent = nullptr;

#define ASSERT_TRUE(expr) do { \
  ++gAssertions; \
  if (!(expr)) { \
    std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n", #expr, __FILE__, __LINE__); \
    std::exit(1); \
  } \
} while (0)

#define ASSERT_NEAR(actual, expected, tol) do { \
  ++gAssertions; \
  const float _a = (actual); \
  const float _e = (expected); \
  if (std::fabs(_a - _e) > (tol)) { \
    std::printf("FAIL\n  Assertion failed: |%s - %s| <= %s (actual=%.6f expected=%.6f)\n  at %s:%d\n", \
      #actual, #expected, #tol, _a, _e, __FILE__, __LINE__); \
    std::exit(1); \
  } \
} while (0)

#define TEST(name) void name(); \
  void run_##name() { \
    ++gTests; gCurrent = #name; \
    std::printf("TEST: %s ... ", #name); \
    name(); \
    ++gPassed; \
    std::printf("PASS\n"); \
  } \
  void name()

using namespace MeasurementConversion;
using Channels::AdcChannel;

TEST(family_mapping_is_channel_aware) {
  ASSERT_TRUE(familyFor(AdcChannel::MUX_7P_AKU) == MeasurementFamily::VEHICLE_DIVIDED);
  ASSERT_TRUE(familyFor(AdcChannel::MUX_7P_GND1) == MeasurementFamily::GND_SENSE);
  ASSERT_TRUE(familyFor(AdcChannel::MUX_15P_GND4) == MeasurementFamily::GND_SENSE);
  ASSERT_TRUE(familyFor(AdcChannel::MUX_7P_CAN_H) == MeasurementFamily::CONNECTOR_CAN);
  ASSERT_TRUE(familyFor(AdcChannel::MUX_15P_CAN_L) == MeasurementFamily::CONNECTOR_CAN);
  ASSERT_TRUE(familyFor(AdcChannel::MUX_CANH_1_R) == MeasurementFamily::CAN_RESISTANCE);
  ASSERT_TRUE(familyFor(static_cast<AdcChannel>(0xFF)) == MeasurementFamily::INVALID);
}

TEST(missing_calibration_is_explicit_pending_not_zero_measurement) {
  CalibrationTable table{};
  clearCalibration(table);
  const PinVoltage result = convertNodeToPin(table, AdcChannel::MUX_7P_AKU, 2.0f);
  ASSERT_TRUE(result.status == ConversionStatus::PENDING);
  ASSERT_TRUE(result.family == MeasurementFamily::VEHICLE_DIVIDED);
}

TEST(linear_calibration_is_applied_only_when_explicitly_set) {
  CalibrationTable table{};
  clearCalibration(table);
  ASSERT_TRUE(setLinearCalibration(table, AdcChannel::MUX_7P_AKU, 10.5f, 0.2f));
  const PinVoltage result = convertNodeToPin(table, AdcChannel::MUX_7P_AKU, 2.0f);
  ASSERT_TRUE(result.status == ConversionStatus::CALIBRATED);
  ASSERT_NEAR(result.vPin, 21.2f, 0.0001f);
}

TEST(calibration_is_per_channel_not_global) {
  CalibrationTable table{};
  clearCalibration(table);
  ASSERT_TRUE(setLinearCalibration(table, AdcChannel::MUX_7P_AKU, 11.0f, 0.0f));
  const PinVoltage aku = convertNodeToPin(table, AdcChannel::MUX_7P_AKU, 2.0f);
  const PinVoltage kontak = convertNodeToPin(table, AdcChannel::MUX_7P_KONTAK, 2.0f);
  ASSERT_TRUE(aku.status == ConversionStatus::CALIBRATED);
  ASSERT_NEAR(aku.vPin, 22.0f, 0.0001f);
  ASSERT_TRUE(kontak.status == ConversionStatus::PENDING);
}

TEST(can_resistance_channels_cannot_be_misused_as_pin_voltage) {
  CalibrationTable table{};
  clearCalibration(table);
  ASSERT_TRUE(setLinearCalibration(table, AdcChannel::MUX_CANH_1_R, 1.0f, 0.0f));
  const PinVoltage result = convertNodeToPin(table, AdcChannel::MUX_CANH_1_R, 1.7f);
  ASSERT_TRUE(result.family == MeasurementFamily::CAN_RESISTANCE);
  ASSERT_TRUE(result.status == ConversionStatus::INVALID);
}

TEST(can_delta_nominal_120_ohm_round_trip) {
  const float referenceV = 3.3f;
  const float referenceOhms = 1500.0f;
  const float targetOhms = 120.0f;
  const float delta = referenceV * targetOhms / ((2.0f * referenceOhms) + targetOhms);
  const float canL = (referenceV - delta) * 0.5f;
  const float canH = canL + delta;
  const CanResistance result = convertCanDeltaToOhms(canH, canL, referenceV, referenceOhms);
  ASSERT_TRUE(result.status == ConversionStatus::DERIVED);
  ASSERT_NEAR(result.ohms, 120.0f, 0.02f);
}

TEST(can_delta_exact_open_is_explicit_open_circuit) {
  const CanResistance result = convertCanDeltaToOhms(3.3f, 0.0f);
  ASSERT_TRUE(result.status == ConversionStatus::OPEN_CIRCUIT);
  ASSERT_TRUE(std::isinf(result.ohms));
}

TEST(can_delta_zero_is_zero_ohm_short) {
  const CanResistance result = convertCanDeltaToOhms(1.65f, 1.65f);
  ASSERT_TRUE(result.status == ConversionStatus::DERIVED);
  ASSERT_NEAR(result.ohms, 0.0f, 0.0001f);
}

TEST(invalid_inputs_fail_closed) {
  CalibrationTable table{};
  clearCalibration(table);
  ASSERT_TRUE(!setLinearCalibration(table, static_cast<AdcChannel>(0xFF), 1.0f, 0.0f));
  const PinVoltage badCh = convertNodeToPin(table, static_cast<AdcChannel>(0xFF), 1.0f);
  ASSERT_TRUE(badCh.status == ConversionStatus::INVALID);
  const CanResistance reversed = convertCanDeltaToOhms(1.0f, 2.0f);
  ASSERT_TRUE(reversed.status == ConversionStatus::INVALID);
}

} // namespace

int main() {
  std::printf("=== Package 3: Measurement Conversion Tests ===\n\n");
  run_family_mapping_is_channel_aware();
  run_missing_calibration_is_explicit_pending_not_zero_measurement();
  run_linear_calibration_is_applied_only_when_explicitly_set();
  run_calibration_is_per_channel_not_global();
  run_can_resistance_channels_cannot_be_misused_as_pin_voltage();
  run_can_delta_nominal_120_ohm_round_trip();
  run_can_delta_exact_open_is_explicit_open_circuit();
  run_can_delta_zero_is_zero_ohm_short();
  run_invalid_inputs_fail_closed();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n", gPassed, gTests, gAssertions);
  return gPassed == gTests ? 0 : 1;
}
