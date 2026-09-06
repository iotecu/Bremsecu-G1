// =============================================================================
// BREMSECU G1 REV-2 — record_store.cpp
// Device-owned ServiceRecord persistence on top of SdService primitives.
//
// DESIGN NOTES:
//  * Layout (PROVISIONAL): authoritative /bremsecu/records/<id>.json (one
//    readable file per record); staging /bremsecu/tmp/<id>.tmp; backup
//    /bremsecu/tmp/<id>.bak.
//  * Record ID (PROVISIONAL): "<mac6>-<yymmddHHMMSS>-<rand4>" — locally
//    generated, stable once persisted, independent of client/IP/AP/STA.
//  * Serialization: versioned human-debuggable JSON, schemaVersion field,
//    empty tests:[] placeholder. Proper JSON escaping/decoding for " \\ \n \r \t.
//  * Bounded C-string safety: every ServiceRecord field is proven NUL-terminated
//    within its declared capacity (terminatedWithin) BEFORE any strcmp/textOk/
//    serialize/unbounded operation. Non-terminated caller data -> INVALID_ARG.
//  * Crash-safe commit (BEST-EFFORT crash-recoverable; NOT guaranteed
//    FAT/filesystem atomicity): serialize -> write temp -> read-back verify ->
//    (fresh: rename temp->auth) OR (update: rename auth->bak, rename temp->auth,
//    on failure restore bak->auth) -> remove bak. Authoritative is NEVER deleted
//    to make room; the last valid version always survives a failed commit.
//  * Recovery returns an explicit RecordError (ensureRecovered) and is inspected
//    by load/save/exists AND by create() collision checking (recovery-aware).
//  * Timestamps from a single validated RtcService sample; failure ->
//    RTC_UNAVAILABLE (never invented).
// =============================================================================

#include "record_store.h"
#include "sd_service.h"
#include "rtc_service.h"

#include <Arduino.h>
#include <string.h>
#include <stdio.h>

namespace RecordStore {

namespace {

// PROVISIONAL layout (not authority-frozen).
const char* kRootDir   = "/bremsecu";
const char* kRecordDir = "/bremsecu/records";
const char* kTmpDir    = "/bremsecu/tmp";

const char* kConnTypes[] = { "iso12098_15pin", "24n_24s_2x7" };

bool gReady = false;
RecordError gErr = RecordError::NONE;

// Bounded static buffers (single-threaded loop task); avoids large stacks.
char gReadBuf[kMaxRecordJsonLen + 1];
char gVerifyBuf[kMaxRecordJsonLen + 1];

// --- bounded C-string helpers ---------------------------------------------------

// True if a NUL terminator exists within [0, capacity-1]. Bounded; never reads
// past the declared array capacity.
bool terminatedWithin(const char* s, size_t capacity) {
  if (s == nullptr) return false;
  for (size_t i = 0; i < capacity; ++i) {
    if (s[i] == '\0') return true;
  }
  return false;
}

// --- bounded JSON writer/reader (storage-local; proper escaping) -------------

void escAppend(String& s, const char* v) {
  for (const char* p = v; *p; ++p) {
    switch (*p) {
      case '"':  s += "\\\""; break;
      case '\\': s += "\\\\"; break;
      case '\n': s += "\\n";  break;
      case '\r': s += "\\r";  break;
      case '\t': s += "\\t";  break;
      default:   s += *p;     break;
    }
  }
}
void putStr(String& s, const char* key, const char* v) {
  s += "\""; s += key; s += "\":\""; escAppend(s, v); s += "\"";
}

bool findKey(const String& body, const char* key, size_t& vp) {
  String needle = String("\"") + key + "\":\"";
  int idx = body.indexOf(needle);
  if (idx < 0) return false;
  vp = (size_t)idx + needle.length();
  return vp <= body.length();
}

bool jgetString(const String& body, const char* key, char* out, size_t outLen) {
  size_t vp = 0;
  if (!findKey(body, key, vp)) return false;
  size_t o = 0;
  for (size_t i = vp; i < body.length(); ++i) {
    char c = body[i];
    if (c == '\\' && i + 1 < body.length()) {
      ++i;
      const char e = body[i];
      switch (e) {
        case '"':  c = '"';  break;
        case '\\': c = '\\'; break;
        case 'n':  c = '\n'; break;
        case 'r':  c = '\r'; break;
        case 't':  c = '\t'; break;
        default:   return false;
      }
    } else if (c == '"') {
      out[o] = '\0';
      return true;
    }
    if (o + 1 >= outLen) return false;
    out[o++] = c;
  }
  return false;
}

bool jgetUint32(const String& body, const char* key, uint32_t& out) {
  String needle = String("\"") + key + "\":";
  int idx = body.indexOf(needle);
  if (idx < 0) return false;
  const char* start = body.c_str() + idx + needle.length();
  char* end = nullptr;
  unsigned long v = strtoul(start, &end, 10);
  if (end == start) return false;
  out = (uint32_t)v;
  return true;
}

// --- id / path / timestamp helpers --------------------------------------------

// Bounded id validation; no unbounded strlen on external input.
bool isValidRecordId(const char* id) {
  if (id == nullptr) return false;
  size_t n = 0;
  while (n <= kMaxIdLen && id[n] != '\0') ++n;
  if (n > kMaxIdLen) return false;  // too long or not terminated within bound
  if (n == 0) return false;
  if (id[0] == '-' || id[n - 1] == '-') return false;
  for (size_t i = 0; i < n; ++i) {
    const char c = id[i];
    const bool ok = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') ||
                    (c >= 'a' && c <= 'z') || (c == '-');
    if (!ok) return false;
  }
  return true;
}

bool recordPath(const char* id, char* buf, size_t len) {
  int n = snprintf(buf, len, "%s/%s.json", kRecordDir, id);
  return n > 0 && (size_t)n < len;
}
bool tempPath(const char* id, char* buf, size_t len) {
  int n = snprintf(buf, len, "%s/%s.tmp", kTmpDir, id);
  return n > 0 && (size_t)n < len;
}
bool bakPath(const char* id, char* buf, size_t len) {
  int n = snprintf(buf, len, "%s/%s.bak", kTmpDir, id);
  return n > 0 && (size_t)n < len;
}

bool filePresent(const char* path, bool& storageErr) {
  storageErr = false;
  if (SdService::exists(path)) return true;
  storageErr = (SdService::lastError() != SdService::SdError::NONE);
  return false;
}

bool formatTs(const RtcService::RtcDateTime& dt, char* out, size_t len) {
  int n = snprintf(out, len, "%04u-%02u-%02uT%02u:%02u:%02u",
                   (unsigned)dt.year, (unsigned)dt.month, (unsigned)dt.day,
                   (unsigned)dt.hour, (unsigned)dt.minute, (unsigned)dt.second);
  return n > 0 && (size_t)n < len;
}

void makeId(char* out, size_t len, const RtcService::RtcDateTime& dt) {
  const uint64_t mac = ESP.getEfuseMac();
  const unsigned rnd = (unsigned)(esp_random() & 0xFFFFu);
  snprintf(out, len, "%02X%02X%02X-%02u%02u%02u%02u%02u%02u-%04X",
           (unsigned)((mac >> 16) & 0xFF), (unsigned)((mac >> 8) & 0xFF),
           (unsigned)(mac & 0xFF),
           (unsigned)(dt.year % 100u), (unsigned)dt.month, (unsigned)dt.day,
           (unsigned)dt.hour, (unsigned)dt.minute, (unsigned)dt.second, rnd);
}

RecordError mapSd(SdService::SdError e, RecordError ioDefault) {
  switch (e) {
    case SdService::SdError::NONE:         return RecordError::NONE;
    case SdService::SdError::NOT_MOUNTED:  return RecordError::NOT_READY;
    case SdService::SdError::INVALID_PATH: return RecordError::INVALID_ARG;
    case SdService::SdError::NOT_FOUND:    return RecordError::NOT_FOUND;
    default:                               return ioDefault;
  }
}

bool validConnType(const char* v) {
  for (size_t i = 0; i < sizeof(kConnTypes) / sizeof(kConnTypes[0]); ++i)
    if (strcmp(v, kConnTypes[i]) == 0) return true;
  return false;
}

bool textOk(const char* v) {
  for (; *v; ++v) {
    const unsigned char c = (unsigned char)*v;
    if (c < 0x20 && c != '\n' && c != '\r' && c != '\t') return false;
  }
  return true;
}

// Termination of every field is proven FIRST (bounded); only then are content
// checks (strcmp/textOk) run. Non-terminated caller data -> INVALID_ARG.
RecordError validateFields(const ServiceRecord& r) {
  if (!terminatedWithin(r.id, sizeof(r.id))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.createdAt, sizeof(r.createdAt))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.updatedAt, sizeof(r.updatedAt))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.customerName, sizeof(r.customerName))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.companyName, sizeof(r.companyName))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.technicianId, sizeof(r.technicianId))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.tractorPlate, sizeof(r.tractorPlate))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.trailerPlate, sizeof(r.trailerPlate))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.tractorChassis, sizeof(r.tractorChassis))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.trailerChassis, sizeof(r.trailerChassis))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.fleetOrTrailerNo, sizeof(r.fleetOrTrailerNo))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.vehicleSideContext, sizeof(r.vehicleSideContext))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.trailerConnectionType, sizeof(r.trailerConnectionType))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.diagnosisNote, sizeof(r.diagnosisNote))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.serviceNote, sizeof(r.serviceNote))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.fee, sizeof(r.fee))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.reportLogoId, sizeof(r.reportLogoId))) return RecordError::INVALID_ARG;
  if (!terminatedWithin(r.status, sizeof(r.status))) return RecordError::INVALID_ARG;

  if (!validConnType(r.trailerConnectionType)) return RecordError::INVALID_ARG;
  if (r.status[0] == '\0') return RecordError::INVALID_ARG;
  if (!textOk(r.customerName) || !textOk(r.companyName) || !textOk(r.technicianId) ||
      !textOk(r.tractorPlate) || !textOk(r.trailerPlate) || !textOk(r.tractorChassis) ||
      !textOk(r.trailerChassis) || !textOk(r.fleetOrTrailerNo) || !textOk(r.vehicleSideContext) ||
      !textOk(r.diagnosisNote) || !textOk(r.serviceNote) || !textOk(r.fee) ||
      !textOk(r.reportLogoId) || !textOk(r.status)) {
    return RecordError::INVALID_ARG;
  }
  return RecordError::NONE;
}

// --- serialization --------------------------------------------------------------

String serialize(const ServiceRecord& r) {
  String s;
  s.reserve(1200);
  s = "{";
  s += "\"schemaVersion\":"; s += String((unsigned)kSchemaVersion); s += ",";
  putStr(s, "id", r.id); s += ",";
  putStr(s, "createdAt", r.createdAt); s += ",";
  putStr(s, "updatedAt", r.updatedAt); s += ",";
  putStr(s, "customerName", r.customerName); s += ",";
  putStr(s, "companyName", r.companyName); s += ",";
  putStr(s, "technicianId", r.technicianId); s += ",";
  putStr(s, "tractorPlate", r.tractorPlate); s += ",";
  putStr(s, "trailerPlate", r.trailerPlate); s += ",";
  putStr(s, "tractorChassis", r.tractorChassis); s += ",";
  putStr(s, "trailerChassis", r.trailerChassis); s += ",";
  putStr(s, "fleetOrTrailerNo", r.fleetOrTrailerNo); s += ",";
  putStr(s, "vehicleSideContext", r.vehicleSideContext); s += ",";
  putStr(s, "trailerConnectionType", r.trailerConnectionType); s += ",";
  putStr(s, "diagnosisNote", r.diagnosisNote); s += ",";
  putStr(s, "serviceNote", r.serviceNote); s += ",";
  putStr(s, "fee", r.fee); s += ",";
  putStr(s, "reportLogoId", r.reportLogoId); s += ",";
  putStr(s, "status", r.status); s += ",";
  s += "\"tests\":[]";
  s += "}";
  return s;
}

RecordError deserialize(const String& body, const char* expectedId, ServiceRecord& out) {
  uint32_t ver = 0;
  if (!jgetUint32(body, "schemaVersion", ver) || ver != kSchemaVersion) {
    return RecordError::MALFORMED;
  }
  int ti = body.indexOf("\"tests\":[");
  if (ti < 0) return RecordError::MALFORMED;
  size_t p = (size_t)ti + strlen("\"tests\":[");
  if (p >= body.length() || body[p] != ']') return RecordError::MALFORMED;

  ServiceRecord r;
  memset(&r, 0, sizeof(r));
  bool ok =
    jgetString(body, "id", r.id, sizeof(r.id)) &&
    jgetString(body, "createdAt", r.createdAt, sizeof(r.createdAt)) &&
    jgetString(body, "updatedAt", r.updatedAt, sizeof(r.updatedAt)) &&
    jgetString(body, "customerName", r.customerName, sizeof(r.customerName)) &&
    jgetString(body, "companyName", r.companyName, sizeof(r.companyName)) &&
    jgetString(body, "technicianId", r.technicianId, sizeof(r.technicianId)) &&
    jgetString(body, "tractorPlate", r.tractorPlate, sizeof(r.tractorPlate)) &&
    jgetString(body, "trailerPlate", r.trailerPlate, sizeof(r.trailerPlate)) &&
    jgetString(body, "tractorChassis", r.tractorChassis, sizeof(r.tractorChassis)) &&
    jgetString(body, "trailerChassis", r.trailerChassis, sizeof(r.trailerChassis)) &&
    jgetString(body, "fleetOrTrailerNo", r.fleetOrTrailerNo, sizeof(r.fleetOrTrailerNo)) &&
    jgetString(body, "vehicleSideContext", r.vehicleSideContext, sizeof(r.vehicleSideContext)) &&
    jgetString(body, "trailerConnectionType", r.trailerConnectionType, sizeof(r.trailerConnectionType)) &&
    jgetString(body, "diagnosisNote", r.diagnosisNote, sizeof(r.diagnosisNote)) &&
    jgetString(body, "serviceNote", r.serviceNote, sizeof(r.serviceNote)) &&
    jgetString(body, "fee", r.fee, sizeof(r.fee)) &&
    jgetString(body, "reportLogoId", r.reportLogoId, sizeof(r.reportLogoId)) &&
    jgetString(body, "status", r.status, sizeof(r.status));
  if (!ok) return RecordError::MALFORMED;

  if (expectedId != nullptr && strcmp(r.id, expectedId) != 0) {
    return RecordError::MALFORMED;
  }
  if (validateFields(r) != RecordError::NONE) return RecordError::MALFORMED;

  out = r;
  return RecordError::NONE;
}

RecordError validateFile(const char* path, const char* id) {
  size_t size = 0;
  if (!SdService::fileSize(path, size)) return mapSd(SdService::lastError(), RecordError::READ_FAILED);
  if (size == 0 || size > kMaxRecordJsonLen) return RecordError::MALFORMED;
  size_t got = 0;
  if (!SdService::readFile(path, (uint8_t*)gReadBuf, kMaxRecordJsonLen, got)) {
    return mapSd(SdService::lastError(), RecordError::READ_FAILED);
  }
  gReadBuf[got] = '\0';
  ServiceRecord tmp;
  return deserialize(String(gReadBuf), id, tmp);
}

RecordError loadRecord(const char* path, const char* id, ServiceRecord& out) {
  size_t size = 0;
  if (!SdService::fileSize(path, size)) return mapSd(SdService::lastError(), RecordError::READ_FAILED);
  if (size == 0 || size > kMaxRecordJsonLen) return RecordError::MALFORMED;
  size_t got = 0;
  if (!SdService::readFile(path, (uint8_t*)gReadBuf, kMaxRecordJsonLen, got)) {
    return mapSd(SdService::lastError(), RecordError::READ_FAILED);
  }
  gReadBuf[got] = '\0';
  return deserialize(String(gReadBuf), id, out);
}

// --- interrupted-commit recovery (BEST-EFFORT, NOT FAT-atomic) ------------------
RecordError ensureRecovered(const char* id) {
  char ap[64], tp[64], bp[64];
  if (!recordPath(id, ap, sizeof(ap)) || !tempPath(id, tp, sizeof(tp)) ||
      !bakPath(id, bp, sizeof(bp))) return RecordError::INVALID_ID;

  bool se = false;
  if (filePresent(ap, se)) {
    if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);
    if (validateFile(ap, id) == RecordError::NONE) {
      SdService::removeFile(tp);
      SdService::removeFile(bp);
      return RecordError::NONE;
    }
    return RecordError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);

  if (filePresent(bp, se)) {
    if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);
    if (validateFile(bp, id) == RecordError::NONE) {
      if (SdService::renameFile(bp, ap)) { SdService::removeFile(tp); return RecordError::NONE; }
      return RecordError::RECOVERY_FAILED;
    }
    return RecordError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);

  if (filePresent(tp, se)) {
    if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);
    if (validateFile(tp, id) == RecordError::NONE) {
      if (SdService::renameFile(tp, ap)) return RecordError::NONE;
      return RecordError::RECOVERY_FAILED;
    }
    return RecordError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), RecordError::READ_FAILED);

  return RecordError::NOT_FOUND;
}

// --- crash-safe commit -----------------------------------------------------------

RecordError commit(const ServiceRecord& r) {
  String content = serialize(r);
  if (content.length() == 0 || content.length() > kMaxRecordJsonLen) {
    return RecordError::SERIALIZATION_FAILED;
  }

  char tp[64], ap[64], bp[64];
  if (!tempPath(r.id, tp, sizeof(tp)) || !recordPath(r.id, ap, sizeof(ap)) ||
      !bakPath(r.id, bp, sizeof(bp))) {
    return RecordError::INVALID_ID;
  }

  bool se = false;
  if (filePresent(tp, se)) SdService::removeFile(tp);

  if (!SdService::writeFile(tp, (const uint8_t*)content.c_str(), content.length())) {
    return mapSd(SdService::lastError(), RecordError::WRITE_FAILED);
  }

  size_t got = 0;
  if (!SdService::readFile(tp, (uint8_t*)gVerifyBuf, kMaxRecordJsonLen, got) ||
      got != content.length() || memcmp(gVerifyBuf, content.c_str(), got) != 0) {
    SdService::removeFile(tp);
    return RecordError::WRITE_FAILED;
  }

  bool authSe = false;
  const bool auth = filePresent(ap, authSe);
  if (authSe) { SdService::removeFile(tp); return RecordError::READ_FAILED; }

  if (!auth) {
    if (!SdService::renameFile(tp, ap)) {
      SdService::removeFile(tp);
      return mapSd(SdService::lastError(), RecordError::COMMIT_FAILED);
    }
    return RecordError::NONE;
  }

  bool bakSe = false;
  if (filePresent(bp, bakSe)) SdService::removeFile(bp);

  if (!SdService::renameFile(ap, bp)) {
    SdService::removeFile(tp);
    return mapSd(SdService::lastError(), RecordError::COMMIT_FAILED);
  }
  if (!SdService::renameFile(tp, ap)) {
    SdService::renameFile(bp, ap);
    SdService::removeFile(tp);
    return RecordError::COMMIT_FAILED;
  }
  SdService::removeFile(bp);
  return RecordError::NONE;
}

} // namespace

// =============================================================================
// Public API
// =============================================================================

bool begin() {
  gReady = false;
  gErr = RecordError::NONE;
  if (!SdService::isReady()) { gErr = RecordError::NOT_READY; return false; }
  if (!SdService::ensureDir(kRootDir) ||
      !SdService::ensureDir(kRecordDir) ||
      !SdService::ensureDir(kTmpDir)) {
    gErr = mapSd(SdService::lastError(), RecordError::NOT_READY);
    return false;
  }
  gReady = true;
  return true;
}

bool isReady() { return gReady; }
RecordError lastError() { return gErr; }

RecordError create(ServiceRecord& rec) {
  if (!gReady) { gErr = RecordError::NOT_READY; return gErr; }
  RecordError ve = validateFields(rec);
  if (ve != RecordError::NONE) { gErr = ve; return gErr; }

  RtcService::RtcDateTime dt;
  if (!RtcService::isReady() || !RtcService::readDateTime(dt)) {
    gErr = RecordError::RTC_UNAVAILABLE; return gErr;
  }
  char ts[kMaxTsLen + 1];
  if (!formatTs(dt, ts, sizeof(ts))) { gErr = RecordError::RTC_UNAVAILABLE; return gErr; }

  // Recovery-aware collision check: a candidate id is free ONLY when there is
  // no recoverable/persisted state for it. Never create over an interrupted or
  // recoverable previous record just because <id>.json is temporarily absent.
  bool placed = false;
  for (int attempt = 0; attempt < kMaxIdRetries; ++attempt) {
    makeId(rec.id, sizeof(rec.id), dt);
    RecordError rr = ensureRecovered(rec.id);
    if (rr == RecordError::NOT_FOUND) { placed = true; break; }        // free
    if (rr == RecordError::NONE) continue;                            // occupied
    if (rr == RecordError::MALFORMED) continue;                       // occupied; keep state
    gErr = rr; return gErr;  // RECOVERY_FAILED / READ_FAILED / NOT_READY / ...
  }
  if (!placed) { gErr = RecordError::ID_COLLISION; return gErr; }

  strncpy(rec.createdAt, ts, sizeof(rec.createdAt) - 1);
  rec.createdAt[sizeof(rec.createdAt) - 1] = '\0';
  strncpy(rec.updatedAt, ts, sizeof(rec.updatedAt) - 1);
  rec.updatedAt[sizeof(rec.updatedAt) - 1] = '\0';

  RecordError e = commit(rec);
  gErr = e;
  return gErr;
}

RecordError load(const char* id, ServiceRecord& out) {
  if (!gReady) { gErr = RecordError::NOT_READY; return gErr; }
  if (!isValidRecordId(id)) { gErr = RecordError::INVALID_ID; return gErr; }

  RecordError rec = ensureRecovered(id);
  if (rec == RecordError::NOT_FOUND) { gErr = rec; return gErr; }
  if (rec != RecordError::NONE)      { gErr = rec; return gErr; }

  char ap[64];
  if (!recordPath(id, ap, sizeof(ap))) { gErr = RecordError::INVALID_ID; return gErr; }
  RecordError e = loadRecord(ap, id, out);
  gErr = e;
  return gErr;
}

RecordError save(const ServiceRecord& rec) {
  if (!gReady) { gErr = RecordError::NOT_READY; return gErr; }
  if (!isValidRecordId(rec.id)) { gErr = RecordError::INVALID_ID; return gErr; }
  RecordError ve = validateFields(rec);
  if (ve != RecordError::NONE) { gErr = ve; return gErr; }

  RecordError recov = ensureRecovered(rec.id);
  if (recov == RecordError::NOT_FOUND) { gErr = recov; return gErr; }
  if (recov != RecordError::NONE)      { gErr = recov; return gErr; }

  char ap[64];
  if (!recordPath(rec.id, ap, sizeof(ap))) { gErr = RecordError::INVALID_ID; return gErr; }
  ServiceRecord existing;
  RecordError le = loadRecord(ap, rec.id, existing);
  if (le != RecordError::NONE) { gErr = le; return gErr; }

  ServiceRecord r = rec;
  strncpy(r.id, existing.id, sizeof(r.id) - 1); r.id[sizeof(r.id) - 1] = '\0';
  strncpy(r.createdAt, existing.createdAt, sizeof(r.createdAt) - 1);
  r.createdAt[sizeof(r.createdAt) - 1] = '\0';

  RtcService::RtcDateTime dt;
  if (!RtcService::isReady() || !RtcService::readDateTime(dt)) {
    gErr = RecordError::RTC_UNAVAILABLE; return gErr;
  }
  char ts[kMaxTsLen + 1];
  if (!formatTs(dt, ts, sizeof(ts))) { gErr = RecordError::RTC_UNAVAILABLE; return gErr; }
  strncpy(r.updatedAt, ts, sizeof(r.updatedAt) - 1);
  r.updatedAt[sizeof(r.updatedAt) - 1] = '\0';

  RecordError e = commit(r);
  gErr = e;
  return gErr;
}

RecordError exists(const char* id, bool& out) {
  out = false;
  if (!gReady) { gErr = RecordError::NOT_READY; return gErr; }
  if (!isValidRecordId(id)) { gErr = RecordError::INVALID_ID; return gErr; }

  RecordError rec = ensureRecovered(id);
  if (rec == RecordError::NOT_FOUND) { gErr = RecordError::NONE; return RecordError::NONE; }
  if (rec != RecordError::NONE)      { gErr = rec; return gErr; }

  out = true;
  gErr = RecordError::NONE;
  return RecordError::NONE;
}

} // namespace RecordStore