#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — record_store.h
// Device-owned persistent ServiceRecord foundation (Phase 4 Step 1 + Step 2 +
// Step 3 test references).
//
// PERSISTENCE MODEL: BEST-EFFORT crash-recoverable; NOT guaranteed FAT atomicity.
// PATHS: card-root-relative ("/bremsecu/..."); the VFS mount point ("/sd")
// belongs to SdService/SD mount configuration and is NOT part of these paths.
//
// STEP-3 SIDECAR SEMANTICS (embedded persistence representation):
//   The ServiceRecord metadata JSON keeps the placeholder "tests":[] for
//   independent readability. The LOGICAL ServiceRecord.tests[] history is
//   backed by the durable sidecar index /bremsecu/records/<id>.tests.json and
//   the evidence files /bremsecu/tests/<id>/<testId>.json. The empty embedded
//   array is NOT the authoritative test history. Report generation must load
//   ServiceRecord + test-ref sidecar + TestResult files.
//
// All buffer sizes / limits PROVISIONAL unless frozen by authority.
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
constexpr uint16_t kMaxPageLimit  = 20;   // PROVISIONAL
constexpr uint16_t kMaxScan       = 200;  // PROVISIONAL
constexpr uint32_t kSchemaVersion = 1;

// Step-3 test-reference limits (PROVISIONAL)
constexpr size_t kMaxTestIdLen    = 24;
constexpr size_t kMaxModeLen      = 32;
constexpr uint8_t kMaxTestsPerRecord = 16;
constexpr size_t kMaxTestIndexJsonLen = 2048;

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

struct TestRef {
  char testId[kMaxTestIdLen + 1];
  char mode[kMaxModeLen + 1];
  char savedAt[kMaxTsLen + 1];
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
  char chassis[kMaxChassisLen + 1];
  char fleetOrTrailerNo[kMaxRefLen + 1];
};
struct SearchParams { RecordFilter filter; uint16_t offset; uint16_t limit; };
struct SearchOutcome {
  uint16_t totalMatched; uint16_t returned; uint16_t offset; uint16_t limit;
  bool hasMore; uint16_t skipped; bool truncated;
};
typedef void (*RecordPageFn)(const ServiceRecord& rec, void* ctx);
RecordError search(const SearchParams& p, RecordPageFn cb, void* ctx, SearchOutcome& out);

// --- Step-3 bounded test references (sidecar index; idempotent by testId) ----
RecordError listTestRefs(const char* recordId, TestRef* out, uint8_t cap, uint8_t& count);
RecordError addTestRef(const char* recordId, const TestRef& ref);

} // namespace RecordStore