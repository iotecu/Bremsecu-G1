#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — sd_service.h
// MicroSD storage primitive service (module MDL5, NET MAP v1.3 §9).
//
// AUTHORITY:
//   - MASTER NET MAP v1.3 §9    (MDL5 pin map; MCU SPI: MISO GPIO34, MOSI
//                                GPIO33, SCK GPIO32, SD_CS GPIO4)
//   - MASTER NET MAP v1.3 §12   (SPI bus: single device = Micro SD module)
//   - docs/engineering/known-hardware-fixes.md (microSD supply-path note:
//                                tested module could not run from 3.3V through
//                                its onboard LDO; corrected supply path used;
//                                final PCB must follow the selected module's
//                                real power requirements — hardware note, no
//                                firmware action)
//
// SPI OWNERSHIP / LIFECYCLE:
//   The SPI bus carries a single device (MDL5). This service owns a dedicated
//   SPIClass instance initialized with the NET MAP pins AND its full
//   lifecycle: SD.begin() failure releases the SPI peripheral (gSpi.end()),
//   and end() releases both the SD mount and the SPI peripheral. Repeated
//   begin()/end() cycles never leave the SPI peripheral initialized while the
//   service is stopped. If a second SPI device is ever added, ownership must
//   move to a central SPI owner.
//
// POLICY:
//   - Primitive storage operations only: mount / info / exists / mkdir /
//     read / write / append / rename / remove.
//   - ensureDir() is idempotent: existing directory => success; existing
//     file => NOT_A_DIRECTORY; otherwise mkdir.
//   - Paths are card-root-relative, must start with '/', must not contain
//     '..' traversal components, and are length-bounded.
//   - Report layout, directory schema, atomic temp+rename policy, retention
//     and record semantics belong to the storage/report layer (Phase 4 /
//     DATA_MODEL.md), NOT here.
//   - SPI clock is PROVISIONAL; PENDING bench characterization.
//
// DELIBERATELY NOT HERE:
//   - NO report JSON logic, NO record schema, NO retention policy.
//   - NO magic numeric sentinels; every operation returns explicit status.
// =============================================================================

#include <cstdint>
#include <cstddef>

#include "pins.h"

namespace SdService {

enum class SdError : uint8_t {
  NONE = 0,
  NOT_MOUNTED,
  MOUNT_FAIL,
  INVALID_PATH,
  NOT_FOUND,
  NOT_A_DIRECTORY,
  IO_ERROR
};

struct SdConfig {
  uint8_t     csPin      = Pins::SD_CS;
  uint32_t    spiHz      = 4000000;
  const char* mountPoint = "/sd";
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
bool readFile(const char* path, uint8_t* buf, size_t maxLen, size_t& outLen);
bool writeFile(const char* path, const uint8_t* data, size_t len);
bool appendFile(const char* path, const uint8_t* data, size_t len);

} // namespace SdService
