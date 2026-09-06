// =============================================================================
// BREMSECU G1 REV-2 — sd_service.cpp
// MicroSD primitives over the dedicated single-device SPI bus.
// Accepted lifecycle: gSpi.begin(...); SD.begin(cs,gSpi,hz,mountPoint);
// mount failure -> gSpi.end(); end() -> SD.end() then gSpi.end().
// Step 2 adds ONLY the bounded listDirectory() primitive.
// =============================================================================

#include "sd_service.h"
#include <SD.h>
#include <SPI.h>

namespace SdService {

namespace {
SdConfig gCfg;
bool gReady = false;
SdError gErr = SdError::NONE;
SPIClass gSpi(HSPI);  // dedicated bus instance (single device: MDL5)

bool isValidPath(const char* p) {
  if (p == nullptr) return false;
  const size_t n = strlen(p);
  if (n == 0 || n >= 64) return false;
  if (p[0] != '/') return false;
  const char* c = p;
  while (*c) {
    const char* s = c;
    while (*c && *c != '/') ++c;
    if ((size_t)(c - s) == 2 && s[0] == '.' && s[1] == '.') return false;
    if (*c == '/') ++c;
  }
  return true;
}
bool guardMounted() {
  if (!gReady) { gErr = SdError::NOT_MOUNTED; return false; }
  return true;
}
} // namespace

bool begin(const SdConfig& cfg) {
  gCfg = cfg; gReady = false; gErr = SdError::NONE;
  gSpi.begin(Pins::SD_SCK, Pins::SD_MISO, Pins::SD_MOSI, -1);
  if (!SD.begin(gCfg.csPin, gSpi, gCfg.spiHz, gCfg.mountPoint)) {
    gSpi.end();  // release peripheral on failure
    gErr = SdError::MOUNT_FAIL;
    return false;
  }
  gReady = true;
  return true;
}

void end() {
  if (gReady) SD.end();
  gReady = false;
  gSpi.end();
}

bool isReady() { return gReady; }
SdError lastError() { return gErr; }

bool storageInfo(uint64_t& totalBytes, uint64_t& usedBytes) {
  if (!guardMounted()) return false;
  totalBytes = SD.totalBytes(); usedBytes = SD.usedBytes();
  gErr = SdError::NONE; return true;
}

bool exists(const char* path) {
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  const bool e = SD.exists(path);
  gErr = SdError::NONE;
  return e;
}

bool ensureDir(const char* path) {
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  File probe = SD.open(path, FILE_READ);
  if (probe) {
    const bool isDir = probe.isDirectory();
    probe.close();
    if (isDir) { gErr = SdError::NONE; return true; }
    gErr = SdError::NOT_A_DIRECTORY; return false;
  }
  if (!SD.mkdir(path)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE; return true;
}

bool removeFile(const char* path) {
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  if (!SD.exists(path)) { gErr = SdError::NOT_FOUND; return false; }
  if (!SD.remove(path)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE; return true;
}

bool renameFile(const char* oldPath, const char* newPath) {
  if (!guardMounted()) return false;
  if (!isValidPath(oldPath) || !isValidPath(newPath)) { gErr = SdError::INVALID_PATH; return false; }
  if (!SD.rename(oldPath, newPath)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE; return true;
}

bool fileSize(const char* path, size_t& outSize) {
  outSize = 0;
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  File f = SD.open(path, FILE_READ);
  if (!f) { gErr = SdError::NOT_FOUND; return false; }
  outSize = f.size(); f.close();
  gErr = SdError::NONE; return true;
}

bool readFile(const char* path, uint8_t* buf, size_t maxLen, size_t& outLen) {
  outLen = 0;
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (buf == nullptr && maxLen > 0)) { gErr = SdError::INVALID_PATH; return false; }
  File f = SD.open(path, FILE_READ);
  if (!f) { gErr = SdError::NOT_FOUND; return false; }
  outLen = f.read(buf, maxLen); f.close();
  gErr = SdError::NONE; return true;
}

bool writeFile(const char* path, const uint8_t* data, size_t len) {
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (data == nullptr && len > 0)) { gErr = SdError::INVALID_PATH; return false; }
  File f = SD.open(path, FILE_WRITE);
  if (!f) { gErr = SdError::IO_ERROR; return false; }
  size_t n = 0; if (len > 0) n = f.write(data, len);
  f.flush(); f.close();
  if (n != len) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE; return true;
}

bool appendFile(const char* path, const uint8_t* data, size_t len) {
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (data == nullptr && len > 0)) { gErr = SdError::INVALID_PATH; return false; }
  File f = SD.open(path, FILE_APPEND);
  if (!f) { gErr = SdError::IO_ERROR; return false; }
  size_t n = 0; if (len > 0) n = f.write(data, len);
  f.flush(); f.close();
  if (n != len) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE; return true;
}

bool listDirectory(const char* path, SdListEntryFn cb, void* ctx, uint16_t maxEntries) {
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }

  File dir = SD.open(path, FILE_READ);
  if (!dir) { gErr = SdError::NOT_FOUND; return false; }
  if (!dir.isDirectory()) { dir.close(); gErr = SdError::NOT_A_DIRECTORY; return false; }

  uint16_t count = 0;
  File entry;
  while (count < maxEntries && (entry = dir.openNextFile())) {
    const bool isDir = entry.isDirectory();
    String full = entry.name();
    entry.close();
    if (cb) {
      int slash = full.lastIndexOf('/');
      const char* base = (slash >= 0) ? full.c_str() + slash + 1 : full.c_str();
      cb(base, isDir, ctx);
    }
    ++count;
  }
  if (entry) entry.close();
  dir.close();
  gErr = SdError::NONE;
  return true;
}

} // namespace SdService