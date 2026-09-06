#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — record_store.h
// Device-owned persistent ServiceRecord foundation (Phase 4 Step 1 + Step 2).
// Step 1: create/load/save/exists + crash-safe commit + recovery.
// Step 2: bounded listing/search. Active-record pointer lives in active_record.h.
//
// AUTHORITY: docs/DATA_MODEL.md, docs/API_CONTRACT.md, sd_service.h, rtc_service.h
// PERSISTENCE MODEL: BEST-EFFORT crash-recoverable; NOT guaranteed FAT atomicity.
// All buffer sizes, ID format, layout, paging limits PROVISIONAL unless frozen.
// =============================================================================

#include <cstdint>
#include <cstddef>

namespace RecordStore {

enum class RecordError : uint8_t {
  NONE = 0, NOT_READY, INVALID_ARG, INVALID_ID, NOT_FOUND,
  SERIALIZATION_FAILED, READ_FAILED, WRITE_FAILED, COMMIT_FAILED,
  RECOVERY_FAILED, ID_COLLISION, MALFORMED, RTC_UNAVAILABLE
};

constexpr size_t kMaxIdLen        = 32;
constexpr size_t kMaxTsLen        = 19;
constexpr size_t kMaxNameLen      = 40;
constexpr size_t kMaxPlateLen     = 15;
constexpr size_t kMaxChassisLen   = 24;
constexpr size_t kMaxRefLen       = 24;
constexpr size_t kMaxNoteLen      = 120;
constexpr size_t kMaxFeeLen       = 16;
constexpr size_t kMaxStatusLen    = 16;
constexpr size_t kMaxRecordJsonLen = 2048;
constexpr int    kMaxIdRetries    = 4;    // PROVISIONAL
constexpr uint16_t kMaxPageLimit  = 20;   // PROVISIONAL page size
constexpr uint16_t kMaxScan       = 200;  // PROVISIONAL scan cap
constexpr uint32_t kSchemaVersion = 1;

struct ServiceRecord {
  char id[kMaxIdLen + 1];
  char createdAt[kMaxTsLen + 1];
  char updatedAt[kMaxTsLen + 1];
  char customerName[kMaxNameLen + 1];
  char companyName[kMaxNameLen + 1];
  char technicianId[kMaxRefLen + 1];
  char tractorPlate[kMaxPlateLen + 1];
  char trailerPlate[kMaxPlateLen + 1];
  char tractorChassis[kMaxChassisLen + 1];
  char trailerChassis[kMaxChassisLen + 1];
  char fleetOrTrailerNo[kMaxRefLen + 1];
  char vehicleSideContext[kMaxRefLen + 1];
  char trailerConnectionType[kMaxRefLen + 1];
  char diagnosisNote[kMaxNoteLen + 1];
  char serviceNote[kMaxNoteLen + 1];
  char fee[kMaxFeeLen + 1];
  char reportLogoId[kMaxRefLen + 1];
  char status[kMaxStatusLen + 1];
};

bool begin();
bool isReady();
RecordError lastError();

RecordError create(ServiceRecord& rec);
RecordError load(const char* id, ServiceRecord& out);
RecordError save(const ServiceRecord& rec);
RecordError exists(const char* id, bool& out);

// --- bounded listing / search (Step 2) ---------------------------------------
struct RecordFilter {
  char customer[kMaxNameLen + 1];
  char tractorPlate[kMaxPlateLen + 1];
  char trailerPlate[kMaxPlateLen + 1];
  char chassis[kMaxChassisLen + 1];       // matches tractor OR trailer chassis
  char fleetOrTrailerNo[kMaxRefLen + 1];
};

struct SearchParams {
  RecordFilter filter;   // empty strings = no restriction
  uint16_t offset;       // PROVISIONAL paging
  uint16_t limit;        // PROVISIONAL paging (capped to kMaxPageLimit)
};

struct SearchOutcome {
  uint16_t totalMatched;
  uint16_t returned;
  uint16_t offset;
  uint16_t limit;
  bool hasMore;
  uint16_t skipped;     // individually malformed/corrupt records skipped
  bool truncated;       // scan cap reached; more records may exist
};

typedef void (*RecordPageFn)(const ServiceRecord& rec, void* ctx);

// Bounded, recovery-aware listing/search. Each candidate is loaded through
// load() (validation + recovery). Corrupt records are skipped and counted,
// never fabricated nor overwritten; enumeration continues past them. Directory
// enumeration failure is propagated (never "zero records"). The callback
// receives only records within the requested page.
RecordError search(const SearchParams& p, RecordPageFn cb, void* ctx, SearchOutcome& out);

} // namespace RecordStore