#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — active_record.h
// Runtime-only "current active service record" workflow pointer.
// PROVISIONAL: NOT persisted across reboot (no NVS behavior invented).
// Stores ONLY the stable record ID; the RecordStore remains authoritative.
// Same value for AP and STA because both hit the same firmware process.
// Storage lives in active_record.cpp (no C++17 inline variables).
// =============================================================================

namespace ActiveRecord {

bool hasActiveRecord();
const char* activeRecordId();
bool setActiveRecordId(const char* id);
void clearActiveRecord();

} // namespace ActiveRecord