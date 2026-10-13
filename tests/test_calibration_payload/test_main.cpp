#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>

#include "calibration_payload.h"

namespace {

int gTests = 0;
int gPassed = 0;
int gAssertions = 0;

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
    ++gTests; \
    std::printf("TEST: %s ... ", #name); \
    name(); \
    ++gPassed; \
    std::printf("PASS\n"); \
  } \
  void name()

using Channels::AdcChannel;
using namespace CalibrationPayload;
using namespace MeasurementConversion;

CalibrationStore::CalibrationRecord validRecord() {
  CalibrationTable table{};
  clearCalibration(table);
  setLinearCalibration(table, AdcChannel::MUX_7P_AKU, 10.75f, 0.125f);
  setLinearCalibration(table, AdcChannel::MUX_7P_CAN_H, 2.5f, -0.05f);
  CalibrationStore::CalibrationRecord record{};
  ASSERT_TRUE(encode(table, kHardwareRevisionRev2, 7, record));
  return record;
}

TEST(valid_payload_round_trip_preserves_metadata_and_coefficients) {
  CalibrationStore::CalibrationRecord record = validRecord();
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) == DecodeStatus::OK);
  ASSERT_TRUE(meta.schemaVersion == kPayloadSchemaVersion);
  ASSERT_TRUE(meta.hardwareRevision == kHardwareRevisionRev2);
  ASSERT_TRUE(meta.calibrationGeneration == 7);
  ASSERT_TRUE(meta.channelCount == Channels::kAdcChannelCount);
  const auto& aku = decoded.channel[static_cast<uint8_t>(AdcChannel::MUX_7P_AKU)];
  ASSERT_TRUE(aku.model == CalibrationModel::LINEAR);
  ASSERT_NEAR(aku.slope, 10.75f, 0.0001f);
  ASSERT_NEAR(aku.offset, 0.125f, 0.0001f);
}

TEST(payload_format_version_mismatch_is_rejected) {
  auto record = validRecord();
  record.payloadFormatVersion = 2;
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::FORMAT_VERSION_MISMATCH);
}

TEST(hardware_revision_mismatch_is_rejected) {
  auto record = validRecord();
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, 3, decoded, meta) ==
              DecodeStatus::HARDWARE_REVISION_MISMATCH);
}

TEST(zero_calibration_generation_is_rejected) {
  auto record = validRecord();
  record.payload[8] = 0;
  record.payload[9] = 0;
  record.payload[10] = 0;
  record.payload[11] = 0;
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::CALIBRATION_GENERATION_INVALID);
}

TEST(channel_count_mismatch_is_rejected) {
  auto record = validRecord();
  record.payload[12] = static_cast<uint8_t>(Channels::kAdcChannelCount - 1);
  record.payload[13] = 0;
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::CHANNEL_COUNT_MISMATCH);
}

TEST(malformed_length_is_rejected) {
  auto record = validRecord();
  --record.payloadLength;
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::MALFORMED);
}

TEST(unknown_model_is_rejected) {
  auto record = validRecord();
  record.payload[kHeaderSize] = 0x7Fu;
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::INVALID_MODEL);
}

TEST(nonfinite_coefficient_is_rejected) {
  auto record = validRecord();
  const size_t index = static_cast<uint8_t>(AdcChannel::MUX_7P_AKU);
  const size_t offset = kHeaderSize + index * kEntrySize;
  const uint32_t nanBits = 0x7FC00000UL;
  record.payload[offset + 4] = static_cast<uint8_t>(nanBits & 0xFFu);
  record.payload[offset + 5] = static_cast<uint8_t>((nanBits >> 8) & 0xFFu);
  record.payload[offset + 6] = static_cast<uint8_t>((nanBits >> 16) & 0xFFu);
  record.payload[offset + 7] = static_cast<uint8_t>((nanBits >> 24) & 0xFFu);
  CalibrationTable decoded{};
  Metadata meta{};
  ASSERT_TRUE(decode(record, kHardwareRevisionRev2, decoded, meta) ==
              DecodeStatus::INVALID_COEFFICIENT);
}

TEST(none_model_cannot_hide_nonzero_coefficients) {
  CalibrationTable table{};
  clearCalibration(table);
  table.channel[0].model = CalibrationModel::NONE;
  table.channel[0].slope = 1.0f;
  CalibrationStore::CalibrationRecord record{};
  ASSERT_TRUE(!encode(table, kHardwareRevisionRev2, 1, record));
}

TEST(zero_generation_cannot_be_encoded) {
  CalibrationTable table{};
  clearCalibration(table);
  CalibrationStore::CalibrationRecord record{};
  ASSERT_TRUE(!encode(table, kHardwareRevisionRev2, 0, record));
}

} // namespace

int main() {
  std::printf("=== Package 4: Calibration Payload Tests ===\n\n");
  run_valid_payload_round_trip_preserves_metadata_and_coefficients();
  run_payload_format_version_mismatch_is_rejected();
  run_hardware_revision_mismatch_is_rejected();
  run_zero_calibration_generation_is_rejected();
  run_channel_count_mismatch_is_rejected();
  run_malformed_length_is_rejected();
  run_unknown_model_is_rejected();
  run_nonfinite_coefficient_is_rejected();
  run_none_model_cannot_hide_nonzero_coefficients();
  run_zero_generation_cannot_be_encoded();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",
              gPassed, gTests, gAssertions);
  return gPassed == gTests ? 0 : 1;
}
