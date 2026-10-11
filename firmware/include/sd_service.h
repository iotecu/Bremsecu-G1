#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — sd_service.h
// MicroSD storage PRIMITIVES only. No record/report/business semantics here.
//
// AUTHORITY:
//   - MASTER NET MAP v1.3 §9 (SD pin map), known-hardware-fixes.md (supply note)
//
// RULES:
//   - Non-blocking per call; transport independent.
//   - Paths root-relative under the configured mountPoint, start '/', no '..'.
//   - Explicit SdError; no magic sentinels; all File handles closed.
//   - Reads are complete-or-fail: caller capacity smaller than file size is an
//     explicit TOO_LARGE error; silent truncation is forbidden.
//   - Dedicated single-device SPI bus owned here (lifecycle in .cpp).
// =============================================================================

#include <cstdint>
#include <cstddef>
#include <Arduino.h>
#include <IPAddress.h>
#include "pins.h"

namespace SdService {

enum class SdError : uint8_t {
  NONE = 0,
  NOT_MOUNTED,
  MOUNT_FAIL,
  INVALID_PATH,
  NOT_FOUND,
  NOT_A_DIRECTORY,
  IO_ERROR,
  TOO_LARGE
};

struct SdConfig {
  uint8_t     csPin      = Pins::SD_CS;   // authority pin (not hardcoded)
  uint32_t    spiHz      = 4000000UL;     // PROVISIONAL
  const char* mountPoint = "/sd";         // accepted default mount point
};

bool begin(const SdConfig& cfg = SdConfig{});
void end();
bool isReady();
SdError lastError();

bool storageInfo(uint64_t& totalBytes, uint64_t& usedBytes);

bool exists(const char* path);
bool ensureDir(const char* path);
bool removeFile(const char* path);
bool renameFile(const char* oldPath, const char* newPath);
bool fileSize(const char* path, size_t& outSize);
// Reads the complete file or fails. If file size exceeds maxLen, returns false,
// sets outLen=0 and lastError()=TOO_LARGE; partial success is never reported.
bool readFile(const char* path, uint8_t* buf, size_t maxLen, size_t& outLen);
bool writeFile(const char* path, const uint8_t* data, size_t len);
bool appendFile(const char* path, const uint8_t* data, size_t len);

// --- bounded directory enumeration (filesystem-only; no record parsing) ------
// Invokes cb(baseName, isDir, ctx) for up to maxEntries entries under path.
// Base names only. All File handles closed. Returns false + explicit
// lastError() on path/storage failure (never masquerades as empty).
typedef void (*SdListEntryFn)(const char* baseName, bool isDir, void* ctx);
bool listDirectory(const char* path, SdListEntryFn cb, void* ctx, uint16_t maxEntries);

} // namespace SdService
