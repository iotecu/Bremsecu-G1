#pragma once

// Structural, fail-closed decoder for persisted ServiceRecord JSON.
// Keeps storage identity extraction on the same hardened JSON authority used
// by fixed-schema HTTP requests. No substring/key-shadow matching is allowed.

#include <Arduino.h>
#include <cstring>

#include "json_lite.h"
#include "record_store.h"

namespace RecordJsonCodec {

inline bool copyRequiredString(
    const String& body,
    const char* key,
    char* out,
    size_t capacity) {
  if (!out || capacity == 0) return false;
  String value;
  if (!JsonLite::getString(body, key, value, capacity - 1)) return false;
  if (value.length() >= capacity) return false;
  std::memcpy(out, value.c_str(), value.length());
  out[value.length()] = '\0';
  return true;
}

inline RecordStore::RecordError parseServiceRecord(
    const String& body,
    const char* expectedId,
    RecordStore::ServiceRecord& out) {
  uint32_t schemaVersion = 0;
  if (!JsonLite::getUint32(body, "schemaVersion", schemaVersion) ||
      schemaVersion != RecordStore::kSchemaVersion) {
    return RecordStore::RecordError::MALFORMED;
  }

  // Embedded tests[] is deliberately a placeholder and must stay exactly an
  // empty top-level array; authoritative test history lives in the sidecar.
  if (!JsonLite::getEmptyArray(body, "tests")) {
    return RecordStore::RecordError::MALFORMED;
  }

  RecordStore::ServiceRecord r{};
  const bool ok =
      copyRequiredString(body, "id", r.id, sizeof(r.id)) &&
      copyRequiredString(body, "createdAt", r.createdAt, sizeof(r.createdAt)) &&
      copyRequiredString(body, "updatedAt", r.updatedAt, sizeof(r.updatedAt)) &&
      copyRequiredString(body, "customerName", r.customerName, sizeof(r.customerName)) &&
      copyRequiredString(body, "companyName", r.companyName, sizeof(r.companyName)) &&
      copyRequiredString(body, "technicianId", r.technicianId, sizeof(r.technicianId)) &&
      copyRequiredString(body, "tractorPlate", r.tractorPlate, sizeof(r.tractorPlate)) &&
      copyRequiredString(body, "trailerPlate", r.trailerPlate, sizeof(r.trailerPlate)) &&
      copyRequiredString(body, "tractorChassis", r.tractorChassis, sizeof(r.tractorChassis)) &&
      copyRequiredString(body, "trailerChassis", r.trailerChassis, sizeof(r.trailerChassis)) &&
      copyRequiredString(body, "fleetOrTrailerNo", r.fleetOrTrailerNo, sizeof(r.fleetOrTrailerNo)) &&
      copyRequiredString(body, "vehicleSideContext", r.vehicleSideContext, sizeof(r.vehicleSideContext)) &&
      copyRequiredString(body, "trailerConnectionType", r.trailerConnectionType, sizeof(r.trailerConnectionType)) &&
      copyRequiredString(body, "diagnosisNote", r.diagnosisNote, sizeof(r.diagnosisNote)) &&
      copyRequiredString(body, "serviceNote", r.serviceNote, sizeof(r.serviceNote)) &&
      copyRequiredString(body, "fee", r.fee, sizeof(r.fee)) &&
      copyRequiredString(body, "reportLogoId", r.reportLogoId, sizeof(r.reportLogoId)) &&
      copyRequiredString(body, "status", r.status, sizeof(r.status));

  if (!ok) return RecordStore::RecordError::MALFORMED;
  if (expectedId && std::strcmp(r.id, expectedId) != 0) {
    return RecordStore::RecordError::MALFORMED;
  }

  out = r;
  return RecordStore::RecordError::NONE;
}

} // namespace RecordJsonCodec
