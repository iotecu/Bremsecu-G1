// =============================================================================
// BREMSECU G1 REV-2 — sd_service.cpp
// MicroSD storage primitives over the dedicated single-device SPI bus.
// Full SPI lifecycle owned here. No report logic, no schema, no magic
// sentinels.
// =============================================================================

#include "sd_service.h"

#include <Arduino.h>
#include <SD.h>
#include <SPI.h>
#include <cstring>

namespace SdService {

namespace {

constexpr size_t kMaxPathLen = 64;

SdConfig   gCfg;
bool       gMounted = false;
SdError    gErr     = SdError::NONE;
SPIClass   gSpi(HSPI);

bool containsTraversal(const char* p) {
  const char* c = p;
  while (*c != '\0') {
    const char* start = c;
    while (*c != '\0' && *c != '/') ++c;
    const size_t len = (size_t)(c - start);
    if (len == 2 && start[0] == '.' && start[1] == '.') return true;
    if (*c == '/') ++c;
  }
  return false;
}

bool isValidPath(const char* p) {
  if (p == nullptr) return false;
  const size_t n = strlen(p);
  if (n == 0 || n >= kMaxPathLen) return false;
  if (p[0] != '/') return false;
  if (containsTraversal(p)) return false;
  return true;
}

bool guardMounted() {
  if (!gMounted) { gErr = SdError::NOT_MOUNTED; return false; }
  return true;
}

} // namespace

bool begin(const SdConfig& cfg) {
  gCfg     = cfg;
  gMounted = false;
  gErr     = SdError::NONE;

  gSpi.begin(Pins::SD_SCK, Pins::SD_MISO, Pins::SD_MOSI, -1);

  if (!SD.begin(gCfg.csPin, gSpi, gCfg.spiHz, gCfg.mountPoint)) {
    gSpi.end();
    gErr = SdError::MOUNT_FAIL;
    return false;
  }
  gMounted = true;
  return true;
}

void end() {
  if (gMounted) SD.end();
  gMounted = false;
  gSpi.end();
}

bool isReady() { return gMounted; }
SdError lastError() { return gErr; }

bool storageInfo(uint64_t& totalBytes, uint64_t& usedBytes) {
  if (!guardMounted()) return false;
  totalBytes = SD.totalBytes();
  usedBytes  = SD.usedBytes();
  gErr = SdError::NONE;
  return true;
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
    gErr = SdError::NOT_A_DIRECTORY;
    return false;
  }

  if (!SD.mkdir(path)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE;
  return true;
}

bool removeFile(const char* path) {
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  if (!SD.exists(path)) { gErr = SdError::NOT_FOUND; return false; }
  if (!SD.remove(path)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE;
  return true;
}

bool renameFile(const char* oldPath, const char* newPath) {
  if (!guardMounted()) return false;
  if (!isValidPath(oldPath) || !isValidPath(newPath)) {
    gErr = SdError::INVALID_PATH;
    return false;
  }
  if (!SD.rename(oldPath, newPath)) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE;
  return true;
}

bool fileSize(const char* path, size_t& outSize) {
  outSize = 0;
  if (!guardMounted()) return false;
  if (!isValidPath(path)) { gErr = SdError::INVALID_PATH; return false; }
  File f = SD.open(path, FILE_READ);
  if (!f) { gErr = SdError::NOT_FOUND; return false; }
  outSize = f.size();
  f.close();
  gErr = SdError::NONE;
  return true;
}

bool readFile(const char* path, uint8_t* buf, size_t maxLen, size_t& outLen) {
  outLen = 0;
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (buf == nullptr && maxLen > 0)) {
    gErr = SdError::INVALID_PATH;
    return false;
  }
  File f = SD.open(path, FILE_READ);
  if (!f) { gErr = SdError::NOT_FOUND; return false; }
  outLen = f.read(buf, maxLen);
  f.close();
  gErr = SdError::NONE;
  return true;
}

bool writeFile(const char* path, const uint8_t* data, size_t len) {
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (data == nullptr && len > 0)) {
    gErr = SdError::INVALID_PATH;
    return false;
  }
  File f = SD.open(path, FILE_WRITE);
  if (!f) { gErr = SdError::IO_ERROR; return false; }
  size_t n = 0;
  if (len > 0) n = f.write(data, len);
  f.flush();
  f.close();
  if (n != len) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE;
  return true;
}

bool appendFile(const char* path, const uint8_t* data, size_t len) {
  if (!guardMounted()) return false;
  if (!isValidPath(path) || (data == nullptr && len > 0)) {
    gErr = SdError::INVALID_PATH;
    return false;
  }
  File f = SD.open(path, FILE_APPEND);
  if (!f) { gErr = SdError::IO_ERROR; return false; }
  size_t n = 0;
  if (len > 0) n = f.write(data, len);
  f.flush();
  f.close();
  if (n != len) { gErr = SdError::IO_ERROR; return false; }
  gErr = SdError::NONE;
  return true;
}

} // namespace SdService
