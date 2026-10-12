#include "calibration_payload.h"

#include <cmath>
#include <cstring>

namespace {

using MeasurementConversion::CalibrationModel;

bool finiteValue(float v) {
  return std::isfinite(v);
}

uint16_t readLe16(const uint8_t* p) {
  return static_cast<uint16_t>(p[0]) |
         (static_cast<uint16_t>(p[1]) << 8);
}

uint32_t readLe32(const uint8_t* p) {
  return static_cast<uint32_t>(p[0]) |
         (static_cast<uint32_t>(p[1]) << 8) |
         (static_cast<uint32_t>(p[2]) << 16) |
         (static_cast<uint32_t>(p[3]) << 24);
}

void writeLe16(uint8_t* p, uint16_t v) {
  p[0] = static_cast<uint8_t>(v & 0xFFu);
  p[1] = static_cast<uint8_t>((v >> 8) & 0xFFu);
}

void writeLe32(uint8_t* p, uint32_t v) {
  p[0] = static_cast<uint8_t>(v & 0xFFu);
  p[1] = static_cast<uint8_t>((v >> 8) & 0xFFu);
  p[2] = static_cast<uint8_t>((v >> 16) & 0xFFu);
  p[3] = static_cast<uint8_t>((v >> 24) & 0xFFu);
}

uint32_t floatBits(float v) {
  uint32_t bits = 0;
  static_assert(sizeof(bits) == sizeof(v), "float serialization requires 32-bit float");
  std::memcpy(&bits, &v, sizeof(bits));
  return bits;
}

float bitsFloat(uint32_t bits) {
  float v = 0.0f;
  std::memcpy(&v, &bits, sizeof(v));
  return v;
}

bool validModel(uint8_t raw) {
  return raw == static_cast<uint8_t>(CalibrationModel::NONE) ||
         raw == static_cast<uint8_t>(CalibrationModel::LINEAR);
}

} // namespace

namespace CalibrationPayload {

bool encode(
    const MeasurementConversion::CalibrationTable& table,
    uint16_t hardwareRevision,
    uint32_t calibrationGeneration,
    CalibrationStore::CalibrationRecord& out) {
  if (hardwareRevision == 0 || calibrationGeneration == 0) return false;

  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) {
    const auto& entry = table.channel[i];
    if (entry.model != CalibrationModel::NONE &&
        entry.model != CalibrationModel::LINEAR) {
      return false;
    }
    if (!finiteValue(entry.slope) || !finiteValue(entry.offset)) return false;
    if (entry.model == CalibrationModel::NONE &&
        (entry.slope != 0.0f || entry.offset != 0.0f)) {
      return false;
    }
  }

  out.payloadFormatVersion = kPayloadFormatVersion;
  out.payloadLength = static_cast<uint16_t>(kEncodedSize);
  std::memset(out.payload, 0, kEncodedSize);

  uint8_t* p = out.payload;
  writeLe32(p + 0, kMagic);
  writeLe16(p + 4, kPayloadSchemaVersion);
  writeLe16(p + 6, hardwareRevision);
  writeLe32(p + 8, calibrationGeneration);
  writeLe16(p + 12, Channels::kAdcChannelCount);
  writeLe16(p + 14, 0);

  size_t offset = kHeaderSize;
  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) {
    const auto& entry = table.channel[i];
    p[offset + 0] = static_cast<uint8_t>(entry.model);
    writeLe32(p + offset + 4, floatBits(entry.slope));
    writeLe32(p + offset + 8, floatBits(entry.offset));
    offset += kEntrySize;
  }

  return true;
}

DecodeStatus decode(
    const CalibrationStore::CalibrationRecord& record,
    uint16_t expectedHardwareRevision,
    MeasurementConversion::CalibrationTable& outTable,
    Metadata& outMetadata) {
  MeasurementConversion::clearCalibration(outTable);
  outMetadata = {0, 0, 0, 0};

  if (expectedHardwareRevision == 0) return DecodeStatus::INVALID_RECORD;
  if (record.payloadFormatVersion != kPayloadFormatVersion) {
    return DecodeStatus::FORMAT_VERSION_MISMATCH;
  }
  if (record.payloadLength != kEncodedSize) return DecodeStatus::MALFORMED;

  const uint8_t* p = record.payload;
  if (readLe32(p + 0) != kMagic) return DecodeStatus::MALFORMED;

  const uint16_t schemaVersion = readLe16(p + 4);
  const uint16_t hardwareRevision = readLe16(p + 6);
  const uint32_t calibrationGeneration = readLe32(p + 8);
  const uint16_t channelCount = readLe16(p + 12);
  const uint16_t reserved = readLe16(p + 14);

  if (schemaVersion != kPayloadSchemaVersion) {
    return DecodeStatus::SCHEMA_VERSION_MISMATCH;
  }
  if (hardwareRevision != expectedHardwareRevision) {
    return DecodeStatus::HARDWARE_REVISION_MISMATCH;
  }
  if (calibrationGeneration == 0) {
    return DecodeStatus::CALIBRATION_GENERATION_INVALID;
  }
  if (channelCount != Channels::kAdcChannelCount) {
    return DecodeStatus::CHANNEL_COUNT_MISMATCH;
  }
  if (reserved != 0) return DecodeStatus::MALFORMED;

  MeasurementConversion::CalibrationTable candidate{};
  MeasurementConversion::clearCalibration(candidate);

  size_t offset = kHeaderSize;
  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) {
    const uint8_t rawModel = p[offset + 0];
    if (!validModel(rawModel) || p[offset + 1] != 0 ||
        p[offset + 2] != 0 || p[offset + 3] != 0) {
      return validModel(rawModel) ? DecodeStatus::MALFORMED
                                  : DecodeStatus::INVALID_MODEL;
    }

    const float slope = bitsFloat(readLe32(p + offset + 4));
    const float coefficientOffset = bitsFloat(readLe32(p + offset + 8));
    if (!finiteValue(slope) || !finiteValue(coefficientOffset)) {
      return DecodeStatus::INVALID_COEFFICIENT;
    }

    const CalibrationModel model = static_cast<CalibrationModel>(rawModel);
    if (model == CalibrationModel::NONE) {
      if (slope != 0.0f || coefficientOffset != 0.0f) {
        return DecodeStatus::INVALID_COEFFICIENT;
      }
    } else {
      candidate.channel[i] = {CalibrationModel::LINEAR, slope, coefficientOffset};
    }

    offset += kEntrySize;
  }

  outTable = candidate;
  outMetadata = {
      schemaVersion,
      hardwareRevision,
      calibrationGeneration,
      channelCount};
  return DecodeStatus::OK;
}

} // namespace CalibrationPayload
