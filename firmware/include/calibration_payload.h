#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — calibration_payload.h
// Typed calibration payload schema above opaque CalibrationStore persistence.
// =============================================================================

#include <cstddef>
#include <cstdint>

#include "calibration_store.h"
#include "measurement_conversion.h"

namespace CalibrationPayload {

constexpr uint16_t kPayloadFormatVersion = 1;
constexpr uint16_t kPayloadSchemaVersion = 1;
constexpr uint16_t kHardwareRevisionRev2 = 2;

// BCP2 in little-endian byte order when serialized.
constexpr uint32_t kMagic = 0x32504342UL;

// Header: magic(4), schema(2), hwRev(2), calGeneration(4), channelCount(2), reserved(2)
constexpr size_t kHeaderSize = 16;
// Entry: model(1), reserved(3), slope IEEE754(4), offset IEEE754(4)
constexpr size_t kEntrySize = 12;
constexpr size_t kEncodedSize =
    kHeaderSize + (Channels::kAdcChannelCount * kEntrySize);

static_assert(kEncodedSize <= CalibrationStore::kMaxPayloadLen,
              "Calibration payload exceeds CalibrationStore capacity");

enum class DecodeStatus : uint8_t {
  OK = 0,
  INVALID_RECORD,
  FORMAT_VERSION_MISMATCH,
  MALFORMED,
  SCHEMA_VERSION_MISMATCH,
  HARDWARE_REVISION_MISMATCH,
  CALIBRATION_GENERATION_INVALID,
  CHANNEL_COUNT_MISMATCH,
  INVALID_MODEL,
  INVALID_COEFFICIENT
};

struct Metadata {
  uint16_t schemaVersion;
  uint16_t hardwareRevision;
  uint32_t calibrationGeneration;
  uint16_t channelCount;
};

// Encode/decode only. These functions do not read/write NVS.
bool encode(
    const MeasurementConversion::CalibrationTable& table,
    uint16_t hardwareRevision,
    uint32_t calibrationGeneration,
    CalibrationStore::CalibrationRecord& out);

DecodeStatus decode(
    const CalibrationStore::CalibrationRecord& record,
    uint16_t expectedHardwareRevision,
    MeasurementConversion::CalibrationTable& outTable,
    Metadata& outMetadata);

} // namespace CalibrationPayload
