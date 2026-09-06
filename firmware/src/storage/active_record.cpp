// =============================================================================
// BREMSECU G1 REV-2 — active_record.cpp
// Runtime-only active-record pointer. ID buffer owned here.
// No C++17 inline variables; RecordStore types included explicitly.
// =============================================================================

#include "active_record.h"
#include "record_store.h"   // for RecordStore::kMaxIdLen
#include <cstddef>
#include <cstring>

namespace ActiveRecord {

namespace {
char gId[RecordStore::kMaxIdLen + 1] = {0};
} // namespace

bool hasActiveRecord() { return gId[0] != '\0'; }

const char* activeRecordId() { return gId; }

bool setActiveRecordId(const char* id) {
  if (id == nullptr) return false;
  size_t n = 0;
  while (n <= RecordStore::kMaxIdLen && id[n] != '\0') ++n;
  if (n > RecordStore::kMaxIdLen) return false;
  memcpy(gId, id, n);
  gId[n] = '\0';
  return true;
}

void clearActiveRecord() { gId[0] = '\0'; }

} // namespace ActiveRecord