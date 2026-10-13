#include "calibration_runtime.h"

#include "calibration_store.h"

namespace CalibrationRuntime {

namespace {

Status gStatus = Status::UNINITIALIZED;
CalibrationPayload::DecodeStatus gPayloadStatus =
    CalibrationPayload::DecodeStatus::INVALID_RECORD;
MeasurementConversion::CalibrationTable gTable{};
uint32_t gCalibrationGeneration = 0;

void clearRuntime() {
  MeasurementConversion::clearCalibration(gTable);
  gCalibrationGeneration = 0;
}

Status mapStoreError(CalibrationStore::CalibrationError error) {
  switch (error) {
    case CalibrationStore::CalibrationError::NOT_READY:
      return Status::STORE_NOT_READY;
    case CalibrationStore::CalibrationError::NOT_FOUND:
      return Status::NOT_FOUND;
    case CalibrationStore::CalibrationError::NONE:
      return Status::UNINITIALIZED;
    default:
      return Status::STORE_ERROR;
  }
}

} // namespace

bool begin() {
  clearRuntime();
  gPayloadStatus = CalibrationPayload::DecodeStatus::INVALID_RECORD;

  if (!CalibrationStore::isReady()) {
    gStatus = Status::STORE_NOT_READY;
    return false;
  }

  CalibrationStore::CalibrationRecord record{};
  const CalibrationStore::CalibrationError storeStatus =
      CalibrationStore::load(record);
  if (storeStatus != CalibrationStore::CalibrationError::NONE) {
    gStatus = mapStoreError(storeStatus);
    return false;
  }

  CalibrationPayload::Metadata metadata{};
  MeasurementConversion::CalibrationTable candidate{};
  gPayloadStatus = CalibrationPayload::decode(
      record,
      CalibrationPayload::kHardwareRevisionRev2,
      candidate,
      metadata);

  if (gPayloadStatus != CalibrationPayload::DecodeStatus::OK) {
    gStatus =
        (gPayloadStatus == CalibrationPayload::DecodeStatus::HARDWARE_REVISION_MISMATCH)
            ? Status::HARDWARE_MISMATCH
            : Status::PAYLOAD_INVALID;
    return false;
  }

  gTable = candidate;
  gCalibrationGeneration = metadata.calibrationGeneration;
  gStatus = Status::READY;
  return true;
}

Status status() { return gStatus; }
bool isReady() { return gStatus == Status::READY; }
CalibrationPayload::DecodeStatus payloadStatus() { return gPayloadStatus; }
uint32_t calibrationGeneration() { return gCalibrationGeneration; }

const MeasurementConversion::CalibrationTable& table() { return gTable; }

bool saveAndActivate(
    const MeasurementConversion::CalibrationTable& tableToSave,
    uint32_t calibrationGenerationValue) {
  // An attempted update must never destroy an already-active, validated
  // calibration. Build and persist the candidate first; replace runtime state
  // only after the normal load/validation path succeeds.
  if (!CalibrationStore::isReady()) return false;

  CalibrationStore::CalibrationRecord record{};
  if (!CalibrationPayload::encode(
          tableToSave,
          CalibrationPayload::kHardwareRevisionRev2,
          calibrationGenerationValue,
          record)) {
    return false;
  }

  const CalibrationStore::CalibrationError saveStatus =
      CalibrationStore::save(record);
  if (saveStatus != CalibrationStore::CalibrationError::NONE) return false;

  // CalibrationStore performs read-back verification. Re-read through the
  // normal schema/hardware validation path before activation.
  return begin();
}

} // namespace CalibrationRuntime
