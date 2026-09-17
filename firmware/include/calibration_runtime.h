#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — calibration_runtime.h
// Runtime bridge: CalibrationStore opaque record -> validated conversion table.
// =============================================================================

#include <cstdint>

#include "calibration_payload.h"
#include "measurement_conversion.h"

namespace CalibrationRuntime {

enum class Status : uint8_t {
  UNINITIALIZED = 0,
  READY,
  STORE_NOT_READY,
  NOT_FOUND,
  STORE_ERROR,
  PAYLOAD_INVALID,
  HARDWARE_MISMATCH
};

// Call after CalibrationStore::begin(). Failure is non-fatal: the table remains
// explicit NONE/PENDING and consumers must refuse calibrated classification.
bool begin();

Status status();
bool isReady();
CalibrationPayload::DecodeStatus payloadStatus();
uint32_t calibrationGeneration();

const MeasurementConversion::CalibrationTable& table();

// Persist and activate an already-reviewed table. The caller owns generation
// policy; zero is rejected by the payload schema.
bool saveAndActivate(
    const MeasurementConversion::CalibrationTable& table,
    uint32_t calibrationGeneration);

} // namespace CalibrationRuntime
