// =============================================================================
// BREMSECU G1 REV-2 — calibration_store.cpp
// Durable calibration-data persistence in ESP32 NVS.
// Uses two independent slots (slotA, slotB) with generation tracking and CRC32
// integrity to survive power-loss during writes.
// =============================================================================

#include "calibration_store.h"
#include <Preferences.h>
#include <string.h>

namespace CalibrationStore {

namespace {

const char* kNamespace = "bremsecu-cal";
const char* kSlotA = "slotA";
const char* kSlotB = "slotB";

Preferences gPrefs;
bool gReady = false;
CalibrationError gErr = CalibrationError::NONE;

constexpr size_t kEnvelopeSize = 20;
constexpr size_t kMaxBlobLen = kEnvelopeSize + kMaxPayloadLen;

// Bounded namespace-static internal storage to avoid large stack allocations.
// CalibrationStore is single-threaded/non-reentrant.
uint8_t gEncodeBuf[kMaxBlobLen];
uint8_t gReadBuf[kMaxBlobLen];
CalibrationRecord gRecA;
CalibrationRecord gRecB;

enum class SlotStatus : uint8_t {
  VALID,
  MISSING,
  CORRUPT,
  READ_ERROR
};

// --- Little-endian helpers -----------------------------------------------------
uint16_t readLe16(const uint8_t* p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}
uint32_t readLe32(const uint8_t* p) {
  return (uint32_t)p[0]
       | ((uint32_t)p[1] << 8)
       | ((uint32_t)p[2] << 16)
       | ((uint32_t)p[3] << 24);
}
void writeLe16(uint8_t* p, uint16_t v) {
  p[0] = v & 0xFF;
  p[1] = (v >> 8) & 0xFF;
}
void writeLe32(uint8_t* p, uint32_t v) {
  p[0] = v & 0xFF;
  p[1] = (v >> 8) & 0xFF;
  p[2] = (v >> 16) & 0xFF;
  p[3] = (v >> 24) & 0xFF;
}

// --- CRC32 (polynomial 0xEDB88320, init 0xFFFFFFFF, final XOR 0xFFFFFFFF) ----
uint32_t calcCrc32(const uint8_t* data, size_t len) {
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < len; ++i) {
        crc ^= data[i];
        for (int j = 0; j < 8; ++j) {
            if (crc & 1) crc = (crc >> 1) ^ 0xEDB88320;
            else crc >>= 1;
        }
    }
    return crc ^ 0xFFFFFFFF;
}

SlotStatus readSlot(const char* key, CalibrationRecord& rec, uint32_t& gen) {
    if (!gPrefs.isKey(key)) return SlotStatus::MISSING;
    size_t len = gPrefs.getBytesLength(key);
    if (len < kEnvelopeSize || len > kMaxBlobLen) return SlotStatus::CORRUPT;

    size_t got = gPrefs.getBytes(key, gReadBuf, kMaxBlobLen);
    if (got != len) return SlotStatus::READ_ERROR;

    if (memcmp(gReadBuf, "BCAL", 4) != 0) return SlotStatus::CORRUPT;
    uint16_t schema = readLe16(gReadBuf + 4);
    if (schema != 1) return SlotStatus::CORRUPT;
    uint16_t fmtVer = readLe16(gReadBuf + 6);
    if (fmtVer == 0) return SlotStatus::CORRUPT;
    gen = readLe32(gReadBuf + 8);
    uint16_t payLen = readLe16(gReadBuf + 12);
    if (payLen == 0 || payLen > kMaxPayloadLen) return SlotStatus::CORRUPT;
    uint16_t res = readLe16(gReadBuf + 14);
    if (res != 0) return SlotStatus::CORRUPT;
    uint32_t storedCrc = readLe32(gReadBuf + 16);

    if (len != kEnvelopeSize + payLen) return SlotStatus::CORRUPT;

    uint32_t calcCrc = 0xFFFFFFFF;
    auto updateCrc = [&](const uint8_t* data, size_t l) {
        for (size_t i = 0; i < l; ++i) {
            calcCrc ^= data[i];
            for (int j = 0; j < 8; ++j) {
                if (calcCrc & 1) calcCrc = (calcCrc >> 1) ^ 0xEDB88320;
                else calcCrc >>= 1;
            }
        }
    };
    updateCrc(gReadBuf, 16);
    updateCrc(gReadBuf + kEnvelopeSize, payLen);
    calcCrc ^= 0xFFFFFFFF;

    if (calcCrc != storedCrc) return SlotStatus::CORRUPT;

    rec.payloadFormatVersion = fmtVer;
    rec.payloadLength = payLen;
    memcpy(rec.payload, gReadBuf + kEnvelopeSize, payLen);
    return SlotStatus::VALID;
}

bool isNewer(uint32_t a, uint32_t b) {
    // Wrap-aware comparison: assumes fewer than 2^31 generation steps between
    // valid slots, which is trivially satisfied for calibration writes.
    return static_cast<int32_t>(a - b) > 0;
}

} // namespace

bool begin() {
    gReady = false;
    gErr = CalibrationError::NONE;
    if (!gPrefs.begin(kNamespace, false)) {
        gErr = CalibrationError::NOT_READY;
        return false;
    }
    gReady = true;
    return true;
}

bool isReady() { return gReady; }
CalibrationError lastError() { return gErr; }

CalibrationError load(CalibrationRecord& out) {
    if (!gReady) { gErr = CalibrationError::NOT_READY; return gErr; }

    uint32_t genA = 0, genB = 0;
    SlotStatus stA = readSlot(kSlotA, gRecA, genA);
    SlotStatus stB = readSlot(kSlotB, gRecB, genB);

    if (stA == SlotStatus::READ_ERROR || stB == SlotStatus::READ_ERROR) {
        gErr = CalibrationError::READ_FAILED;
        return gErr;
    }

    if (stA == SlotStatus::MISSING && stB == SlotStatus::MISSING) {
        gErr = CalibrationError::NOT_FOUND;
        return gErr;
    }
    if (stA != SlotStatus::VALID && stB != SlotStatus::VALID) {
        gErr = CalibrationError::MALFORMED;
        return gErr;
    }

    if (stA == SlotStatus::VALID && stB == SlotStatus::VALID) {
        out = isNewer(genA, genB) ? gRecA : gRecB;
    } else if (stA == SlotStatus::VALID) {
        out = gRecA;
    } else {
        out = gRecB;
    }
    gErr = CalibrationError::NONE;
    return gErr;
}

CalibrationError save(const CalibrationRecord& record) {
    if (!gReady) { gErr = CalibrationError::NOT_READY; return gErr; }
    if (record.payloadFormatVersion == 0 || record.payloadLength == 0 || record.payloadLength > kMaxPayloadLen) {
        gErr = CalibrationError::INVALID_ARG;
        return gErr;
    }

    uint32_t genA = 0, genB = 0;
    SlotStatus stA = readSlot(kSlotA, gRecA, genA);
    SlotStatus stB = readSlot(kSlotB, gRecB, genB);

    if (stA == SlotStatus::READ_ERROR || stB == SlotStatus::READ_ERROR) {
        gErr = CalibrationError::READ_FAILED;
        return gErr;
    }

    const char* target = nullptr;
    uint32_t newGen = 0;

    if (stA == SlotStatus::MISSING && stB == SlotStatus::MISSING) {
        target = kSlotA; newGen = 1;
    } else if (stA != SlotStatus::VALID && stB != SlotStatus::VALID) {
        // Existing keys present but BOTH corrupt (or one missing, one corrupt):
        // refuse to overwrite.
        gErr = CalibrationError::MALFORMED;
        return gErr;
    } else if (stA == SlotStatus::VALID && stB == SlotStatus::VALID) {
        if (isNewer(genA, genB)) { target = kSlotB; newGen = genA + 1; }
        else { target = kSlotA; newGen = genB + 1; }
    } else if (stA == SlotStatus::VALID) {
        target = kSlotB; newGen = genA + 1;
    } else {
        target = kSlotA; newGen = genB + 1;
    }

    memcpy(gEncodeBuf, "BCAL", 4);
    writeLe16(gEncodeBuf + 4, 1); // storageSchemaVersion = 1
    writeLe16(gEncodeBuf + 6, record.payloadFormatVersion);
    writeLe32(gEncodeBuf + 8, newGen);
    writeLe16(gEncodeBuf + 12, record.payloadLength);
    writeLe16(gEncodeBuf + 14, 0); // reserved

    uint32_t calcCrc = 0xFFFFFFFF;
    auto updateCrc = [&](const uint8_t* data, size_t l) {
        for (size_t i = 0; i < l; ++i) {
            calcCrc ^= data[i];
            for (int j = 0; j < 8; ++j) {
                if (calcCrc & 1) calcCrc = (calcCrc >> 1) ^ 0xEDB88320;
                else calcCrc >>= 1;
            }
        }
    };
    updateCrc(gEncodeBuf, 16);
    updateCrc(record.payload, record.payloadLength);
    calcCrc ^= 0xFFFFFFFF;

    writeLe32(gEncodeBuf + 16, calcCrc);
    memcpy(gEncodeBuf + kEnvelopeSize, record.payload, record.payloadLength);
    size_t totalLen = kEnvelopeSize + record.payloadLength;

    size_t written = gPrefs.putBytes(target, gEncodeBuf, totalLen);
    if (written != totalLen) {
        gErr = CalibrationError::WRITE_FAILED;
        return gErr;
    }

    // Full read-back verification
    size_t got = gPrefs.getBytes(target, gReadBuf, kMaxBlobLen);
    if (got != totalLen) {
        gErr = CalibrationError::VERIFY_FAILED;
        return gErr;
    }
    if (memcmp(gEncodeBuf, gReadBuf, totalLen) != 0) {
        gErr = CalibrationError::VERIFY_FAILED;
        return gErr;
    }

    // Validate the newly written slot via the normal read path.
    // We can reuse gRecA as the dummy record since we don't need the old A/B records anymore.
    uint32_t dummyGen;
    if (readSlot(target, gRecA, dummyGen) != SlotStatus::VALID) {
        gErr = CalibrationError::VERIFY_FAILED;
        return gErr;
    }

    gErr = CalibrationError::NONE;
    return gErr;
}

} // namespace CalibrationStore