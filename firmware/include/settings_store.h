#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — settings_store.h
// Device-owned user/product configuration (Phase 4 Step 4).
//
// AUTHORITY: docs/DATA_MODEL.md, docs/API_CONTRACT.md, SdService, RTC.
// PERSISTENCE MODEL: BEST-EFFORT crash-recoverable; NOT guaranteed FAT atomicity.
// PATHS: card-root-relative ("/bremsecu/config/..."); the VFS mount point
// ("/sd") belongs to SdService/SD mount configuration and is NOT part of
// these paths.
//
// SAFETY BOUNDARY: This layer stores configuration ONLY. It has NO TPIC /
// relay / K1 / K6 / CAN / TestEngine / SafetyInterlocks / NetworkService /
// Wi-Fi / calibration / engineering-threshold logic.
//
// All buffer sizes / limits below are PROVISIONAL unless frozen by authority.
// =============================================================================

#include <cstdint>
#include <cstddef>

namespace SettingsStore {

enum class SettingsError : uint8_t {
  NONE = 0,
  NOT_READY,          // storage (or settings layer) not initialized
  INVALID_ARG,        // bad/non-terminated field / unsupported language / dup ID
  NOT_FOUND,          // no authoritative settings file (caller uses defaults)
  MALFORMED,          // stored settings corrupt / unknown schema / trailing garbage
  SERIALIZATION_FAILED,
  READ_FAILED,
  WRITE_FAILED,
  COMMIT_FAILED,
  RECOVERY_FAILED
};

// --- PROVISIONAL fixed limits (embedded-safe; not authority-frozen) ----------
constexpr size_t   kMaxLanguageLen        = 2;
constexpr uint8_t  kMaxTechnicians        = 16;
constexpr size_t   kMaxTechIdLen          = 24;
constexpr size_t   kMaxTechNameLen        = 40;
constexpr size_t   kMaxServiceCompanyLen  = 80;
constexpr size_t   kMaxServiceAddressLen  = 160;
constexpr size_t   kMaxServicePhoneLen    = 32;
constexpr size_t   kMaxServiceEmailLen    = 80;
constexpr size_t   kMaxReportLogoIdLen    = 24;
constexpr size_t   kMaxSettingsJsonLen    = 4096;
constexpr uint32_t kSchemaVersion         = 1;

struct Technician {
  char id[kMaxTechIdLen + 1];
  char name[kMaxTechNameLen + 1];
  bool active;
};

struct Settings {
  char language[kMaxLanguageLen + 1];
  bool keepScreenAwake;
  Technician technicians[kMaxTechnicians];
  uint8_t technicianCount;
  char serviceCompany[kMaxServiceCompanyLen + 1];
  char serviceAddress[kMaxServiceAddressLen + 1];
  char servicePhone[kMaxServicePhoneLen + 1];
  char serviceEmail[kMaxServiceEmailLen + 1];
  char reportLogoId[kMaxReportLogoIdLen + 1];
};

bool begin();
bool isReady();
SettingsError lastError();

// Fill `out` with bounded factory defaults. Used by callers when no settings
// file exists yet (which is a healthy state, not an error).
void defaults(Settings& out);

// Load authoritative settings from SD. If the file is missing, returns
// NOT_FOUND (caller should use defaults()). If corrupt/malformed, returns
// MALFORMED (caller MUST NOT silently fall back to defaults).
SettingsError load(Settings& out);

// Persist `settings` using the best-effort temp/backup/rename pattern.
SettingsError save(const Settings& settings);

} // namespace SettingsStore