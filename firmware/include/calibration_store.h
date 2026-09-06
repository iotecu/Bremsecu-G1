#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — calibration_store.h
// Durable calibration-data persistence infrastructure (Phase 4 Step 5).
//
// AUTHORITY: docs/engineering/calibration.md, ESP32 NVS/Preferences.
// PERSISTENCE MODEL: Two-slot NVS with generation tracking and CRC32 integrity.
//
// SAFETY BOUNDARY: This layer owns durability and integrity ONLY. It stores a
// bounded VERSIONED OPAQUE PAYLOAD. It does NOT interpret coefficients, apply
// calibration to AdcService, or freeze any engineering model. The actual
// coefficient schema remains PENDING and will be defined in a later phase.
//
// All storage limits/protocol constants are PROVISIONAL.
// =============================================================================

#include <cstdint>
#include <cstddef>

namespace CalibrationStore {

enum class CalibrationError : uint8_t {
  NONE = 0,
  NOT_READY,      // Preferences namespace could not be opened
  NOT_FOUND,      // Virgin device: neither calibration slot exists
  INVALID_ARG,    // Caller supplied invalid payload format/version/length
  MALFORMED,      // NVS data exists but no valid slot survives validation
  READ_FAILED,    // NVS read operation failed unexpectedly
  WRITE_FAILED,   // putBytes failed or wrote wrong size
  VERIFY_FAILED   // Read-back mismatch or newly written slot fails integrity
};

constexpr size_t kMaxPayloadLen = 2048;   // PROVISIONAL storage bound

struct CalibrationRecord {
  uint16_t payloadFormatVersion;
  uint16_t payloadLength;
  uint8_t payload[kMaxPayloadLen];
};

bool begin();
bool isReady();
CalibrationError lastError();

CalibrationError load(CalibrationRecord& out);
CalibrationError save(const CalibrationRecord& record);

} // namespace CalibrationStore