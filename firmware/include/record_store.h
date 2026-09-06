#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — record_store.h
// Device-owned persistent ServiceRecord foundation (Phase 4 / Step 1).
//
// AUTHORITY:
//   - docs/DATA_MODEL.md        (ServiceRecord schema, persistence rules)
//   - docs/API_CONTRACT.md      (client-independent record ownership)
//   - firmware/include/sd_service.h  (primitive storage only; semantics live HERE)
//   - firmware/include/rtc_service.h (persistent timestamps)
//
// PRODUCT RULE (client-independent history):
//   Records are owned by the BREMSECU device on microSD. AP and STA are only
//   two network access paths to the SAME store. No AP/STA/phone/tablet-specific
//   record logic exists here. PWA cache (later) is non-authoritative only.
//
// SAFETY BOUNDARY:
//   This layer stores data ONLY. It has NO TPIC / relay / K1 / K6 / CAN /
//   TestEngine / Wi-Fi access or logic.
//
// CALLER CONTRACT:
//   Every ServiceRecord field is a fixed char[] that MUST be NUL-terminated
//   within its declared capacity before calling create()/save(). Zero-initialize
//   the struct (e.g. memset) and then fill fields. Non-terminated caller data
//   is rejected with INVALID_ARG (never silently truncated/forced).
//
// PERSISTENCE MODEL:
//   BEST-EFFORT crash-recoverable; NOT guaranteed FAT/filesystem atomicity.
//   Recovery returns an explicit RecordError and never silently collapses a
//   failed/ambiguous recovery into NOT_FOUND.
//
// SCOPE (Step 1): create / load / save(update-only) / exists + crash-safe
//   commit + recovery. NO HTTP, NO reports, NO TestEngine->TestResult
//   serialization, NO settings persistence, NO retention, NO search/filter.
//
// All buffer sizes, ID format, layout, timestamp format and retry counts below
// are PROVISIONAL unless explicitly frozen by authority.
// =============================================================================

#include <cstdint>
#include <cstddef>

namespace RecordStore {

enum class RecordError : uint8_t {
  NONE = 0,
  NOT_READY,          // storage (or record layer) not initialized
  INVALID_ARG,        // bad/non-terminated field value / unsupported control char
  INVALID_ID,         // record id fails format/traversal guards
  NOT_FOUND,          // no record at that id
  SERIALIZATION_FAILED,
  READ_FAILED,
  WRITE_FAILED,
  COMMIT_FAILED,      // commit/rename step failed; previous version preserved
  RECOVERY_FAILED,    // interrupted-commit recovery could not restore a valid copy
  ID_COLLISION,       // generated id still occupied after bounded retries
  MALFORMED,          // stored record corrupt / incomplete / newer schema
  RTC_UNAVAILABLE     // persistent timestamp could not be obtained
};

// --- PROVISIONAL fixed limits (embedded-safe; not authority-frozen) ----------
constexpr size_t kMaxIdLen        = 32;
constexpr size_t kMaxTsLen        = 19;  // "YYYY-MM-DDTHH:MM:SS"
constexpr size_t kMaxNameLen      = 40;
constexpr size_t kMaxPlateLen     = 15;
constexpr size_t kMaxChassisLen   = 24;
constexpr size_t kMaxRefLen       = 24;
constexpr size_t kMaxNoteLen      = 120;
constexpr size_t kMaxFeeLen       = 16;
constexpr size_t kMaxStatusLen    = 16;
constexpr size_t kMaxRecordJsonLen = 2048;
constexpr int    kMaxIdRetries    = 4;   // PROVISIONAL collision retry bound

constexpr uint32_t kSchemaVersion = 1;

// Persistent ServiceRecord identity/metadata (docs/DATA_MODEL.md).
// tests[] is represented in the serialized schema (empty in Step 1); actual
// TestResult serialization belongs to the next storage/report step.
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
  char trailerConnectionType[kMaxRefLen + 1]; // iso12098_15pin | 24n_24s_2x7
  char diagnosisNote[kMaxNoteLen + 1];
  char serviceNote[kMaxNoteLen + 1];
  char fee[kMaxFeeLen + 1];
  char reportLogoId[kMaxRefLen + 1];
  char status[kMaxStatusLen + 1];
};

// Initialize directories and readiness. Requires SdService ready.
bool begin();
bool isReady();
RecordError lastError();

// Create a NEW record (the only creating operation). Caller must supply a
// fully NUL-terminated ServiceRecord. Single validated RTC sample drives
// createdAt, updatedAt and the ID timestamp portion; recovery-aware bounded
// collision retries; crash-safe commit.
RecordError create(ServiceRecord& rec);

// Load by stable id. Runs recovery first and inspects its explicit result.
// Fails explicitly on corrupt/incomplete data; never fabricates fields; never
// overwrites the stored file.
RecordError load(const char* id, ServiceRecord& out);

// Update an EXISTING record ONLY (returns NOT_FOUND if absent). Preserves
// immutable identity fields (id, createdAt); caller may change mutable
// metadata; refreshes only updatedAt from RTC. Crash-safe backup commit.
RecordError save(const ServiceRecord& rec);

// Existence check by id (runs recovery first; explicit result).
RecordError exists(const char* id, bool& out);

} // namespace RecordStore