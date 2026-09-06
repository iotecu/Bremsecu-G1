// =============================================================================
// BREMSECU G1 REV-2 — settings_store.cpp
// Device-owned user/product configuration persistence on top of SdService.
// PERSISTENCE MODEL: BEST-EFFORT crash-recoverable; NOT guaranteed FAT atomicity.
// =============================================================================

#include "settings_store.h"
#include "sd_service.h"

#include <Arduino.h>
#include <string.h>
#include <stdio.h>

namespace SettingsStore {

namespace {

const char* kConfigDir = "/bremsecu/config";
const char* kAuthPath  = "/bremsecu/config/settings.json";
const char* kTmpPath   = "/bremsecu/tmp/settings.tmp";
const char* kBakPath   = "/bremsecu/tmp/settings.bak";

constexpr size_t kLangCount = 14;
const char* const kLanguages[kLangCount] = {
  "tr","en","de","fr","it","el","ru","ar","fa","bg","pl","sr","ro","es"
};

bool gReady = false;
SettingsError gErr = SettingsError::NONE;

char gReadBuf[kMaxSettingsJsonLen + 1];
char gVerifyBuf[kMaxSettingsJsonLen + 1];

bool terminatedWithin(const char* s, size_t capacity) {
  if (s == nullptr) return false;
  for (size_t i = 0; i < capacity; ++i) if (s[i] == '\0') return true;
  return false;
}

bool textOk(const char* v) {
  for (; *v; ++v) {
    const unsigned char c = (unsigned char)*v;
    if (c < 0x20 && c != '\n' && c != '\r' && c != '\t') return false;
  }
  return true;
}

bool isLanguageSupported(const char* v) {
  for (size_t i = 0; i < kLangCount; ++i) if (strcmp(v, kLanguages[i]) == 0) return true;
  return false;
}

bool filePresent(const char* path, bool& storageErr) {
  storageErr = false;
  if (SdService::exists(path)) return true;
  storageErr = (SdService::lastError() != SdService::SdError::NONE);
  return false;
}

SettingsError mapSd(SdService::SdError e, SettingsError d) {
  switch (e) {
    case SdService::SdError::NONE:         return SettingsError::NONE;
    case SdService::SdError::NOT_MOUNTED:  return SettingsError::NOT_READY;
    case SdService::SdError::INVALID_PATH: return SettingsError::INVALID_ARG;
    case SdService::SdError::NOT_FOUND:    return SettingsError::NOT_FOUND;
    default:                               return d;
  }
}

// --- bounded strict JSON cursor parser ---------------------------------------
struct JsonCursor {
  const char* s;
  size_t len;
  size_t pos;
};

void skipWs(JsonCursor& c) {
  while (c.pos < c.len && (c.s[c.pos]==' '||c.s[c.pos]=='\t'||c.s[c.pos]=='\n'||c.s[c.pos]=='\r')) c.pos++;
}

bool expectChar(JsonCursor& c, char ch) {
  skipWs(c);
  if (c.pos < c.len && c.s[c.pos] == ch) { c.pos++; return true; }
  return false;
}

bool peekChar(JsonCursor& c, char ch) {
  skipWs(c);
  return c.pos < c.len && c.s[c.pos] == ch;
}

bool parseString(JsonCursor& c, char* out, size_t cap, size_t& outLen) {
  skipWs(c);
  if (c.pos >= c.len || c.s[c.pos] != '"') return false;
  c.pos++;
  outLen = 0;
  if (cap == 0) return false;
  while (c.pos < c.len) {
    char ch = c.s[c.pos++];
    if (ch == '"') {
      out[outLen] = '\0';
      return true;
    }
    if (ch == '\\') {
      if (c.pos >= c.len) return false;
      char esc = c.s[c.pos++];
      char mapped = 0;
      switch(esc) {
        case '"': mapped = '"'; break;
        case '\\': mapped = '\\'; break;
        case '/': mapped = '/'; break;
        case 'n': mapped = '\n'; break;
        case 'r': mapped = '\r'; break;
        case 't': mapped = '\t'; break;
        default: return false; // invalid escape
      }
      if (outLen >= cap - 1) return false; // overlong
      out[outLen++] = mapped;
    } else {
      if ((unsigned char)ch < 0x20) return false;
      if (outLen >= cap - 1) return false; // overlong
      out[outLen++] = ch;
    }
  }
  return false; // unterminated
}

bool parseBool(JsonCursor& c, bool& out) {
  skipWs(c);
  if (c.pos + 4 <= c.len && memcmp(c.s + c.pos, "true", 4) == 0) {
    c.pos += 4; out = true; return true;
  }
  if (c.pos + 5 <= c.len && memcmp(c.s + c.pos, "false", 5) == 0) {
    c.pos += 5; out = false; return true;
  }
  return false;
}

bool parseUint32(JsonCursor& c, uint32_t& out) {
  skipWs(c);
  if (c.pos >= c.len || c.s[c.pos] < '0' || c.s[c.pos] > '9') return false;
  uint32_t val = 0;
  while (c.pos < c.len && c.s[c.pos] >= '0' && c.s[c.pos] <= '9') {
    const uint32_t digit = (uint32_t)(c.s[c.pos] - '0');
    if (val > (UINT32_MAX - digit) / 10u) return false;
    val = val * 10u + digit;
    c.pos++;
  }
  out = val;
  return true;
}

// --- serialize / deserialize -------------------------------------------------
void escAppend(String& s, const char* v) {
  for (const char* p = v; *p; ++p) {
    switch (*p) {
      case '"': s += "\\\""; break; case '\\': s += "\\\\"; break;
      case '\n': s += "\\n"; break; case '\r': s += "\\r"; break;
      case '\t': s += "\\t"; break; default: s += *p; break;
    }
  }
}
void putStr(String& s, const char* key, const char* v) {
  s += "\""; s += key; s += "\":\""; escAppend(s, v); s += "\"";
}
void putBool(String& s, const char* key, bool v) {
  s += "\""; s += key; s += "\":"; s += v ? "true" : "false";
}

String serialize(const Settings& s) {
  String out; out.reserve(2048);
  out = "{";
  out += "\"schemaVersion\":"; out += String((unsigned)kSchemaVersion); out += ",";
  putStr(out, "language", s.language); out += ",";
  putBool(out, "keepScreenAwake", s.keepScreenAwake); out += ",";
  out += "\"technicians\":[";
  for (uint8_t i = 0; i < s.technicianCount; ++i) {
    if (i) out += ",";
    out += "{"; putStr(out, "id", s.technicians[i].id); out += ",";
    putStr(out, "name", s.technicians[i].name); out += ",";
    putBool(out, "active", s.technicians[i].active);
    out += "}";
  }
  out += "],";
  putStr(out, "serviceCompany", s.serviceCompany); out += ",";
  putStr(out, "serviceAddress", s.serviceAddress); out += ",";
  putStr(out, "servicePhone", s.servicePhone); out += ",";
  putStr(out, "serviceEmail", s.serviceEmail); out += ",";
  putStr(out, "reportLogoId", s.reportLogoId);
  out += "}";
  return out;
}

SettingsError deserialize(const char* s, size_t len, Settings& out) {
  JsonCursor c = {s, len, 0};
  if (!expectChar(c, '{')) return SettingsError::MALFORMED;

  bool hasSchema=false, hasLang=false, hasKeepAwake=false, hasTechs=false;
  bool hasComp=false, hasAddr=false, hasPhone=false, hasEmail=false, hasLogo=false;

  Settings temp;
  defaults(temp);

  if (peekChar(c, '}')) {
    c.pos++;
  } else {
    while (true) {
      char key[32]; size_t keyLen;
      if (!parseString(c, key, sizeof(key), keyLen)) return SettingsError::MALFORMED;
      if (!expectChar(c, ':')) return SettingsError::MALFORMED;

      if (strcmp(key, "schemaVersion") == 0) {
        if (hasSchema) return SettingsError::MALFORMED; hasSchema = true;
        uint32_t ver; if (!parseUint32(c, ver) || ver != kSchemaVersion) return SettingsError::MALFORMED;
      } else if (strcmp(key, "language") == 0) {
        if (hasLang) return SettingsError::MALFORMED; hasLang = true;
        size_t slen;
        if (!parseString(c, temp.language, sizeof(temp.language), slen)) return SettingsError::MALFORMED;
        if (!isLanguageSupported(temp.language)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "keepScreenAwake") == 0) {
        if (hasKeepAwake) return SettingsError::MALFORMED; hasKeepAwake = true;
        if (!parseBool(c, temp.keepScreenAwake)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "technicians") == 0) {
        if (hasTechs) return SettingsError::MALFORMED; hasTechs = true;
        if (!expectChar(c, '[')) return SettingsError::MALFORMED;
        temp.technicianCount = 0;
        if (!peekChar(c, ']')) {
          while (true) {
            if (temp.technicianCount >= kMaxTechnicians) return SettingsError::MALFORMED;
            if (!expectChar(c, '{')) return SettingsError::MALFORMED;
            bool hasId=false, hasName=false, hasActive=false;
            Technician t; memset(&t, 0, sizeof(t));
            if (!peekChar(c, '}')) {
              while (true) {
                char tkey[16]; size_t tkeyLen;
                if (!parseString(c, tkey, sizeof(tkey), tkeyLen)) return SettingsError::MALFORMED;
                if (!expectChar(c, ':')) return SettingsError::MALFORMED;
                if (strcmp(tkey, "id") == 0) {
                  if (hasId) return SettingsError::MALFORMED; hasId = true;
                  size_t slen;
                  if (!parseString(c, t.id, sizeof(t.id), slen)) return SettingsError::MALFORMED;
                } else if (strcmp(tkey, "name") == 0) {
                  if (hasName) return SettingsError::MALFORMED; hasName = true;
                  size_t slen;
                  if (!parseString(c, t.name, sizeof(t.name), slen)) return SettingsError::MALFORMED;
                } else if (strcmp(tkey, "active") == 0) {
                  if (hasActive) return SettingsError::MALFORMED; hasActive = true;
                  if (!parseBool(c, t.active)) return SettingsError::MALFORMED;
                } else {
                  return SettingsError::MALFORMED;
                }
                if (!expectChar(c, ',')) {
                  if (!expectChar(c, '}')) return SettingsError::MALFORMED;
                  break;
                }
              }
            } else {
              c.pos++;
            }
            if (!hasId || !hasName || !hasActive) return SettingsError::MALFORMED;
            if (t.id[0] == '\0' || t.name[0] == '\0') return SettingsError::MALFORMED;
            if (!textOk(t.id) || !textOk(t.name)) return SettingsError::MALFORMED;
            for (uint8_t k = 0; k < temp.technicianCount; ++k) {
              if (strcmp(temp.technicians[k].id, t.id) == 0) return SettingsError::MALFORMED;
            }
            temp.technicians[temp.technicianCount++] = t;
            if (!expectChar(c, ',')) {
              if (!expectChar(c, ']')) return SettingsError::MALFORMED;
              break;
            }
          }
        } else {
          c.pos++;
        }
      } else if (strcmp(key, "serviceCompany") == 0) {
        if (hasComp) return SettingsError::MALFORMED; hasComp = true;
        size_t slen; if (!parseString(c, temp.serviceCompany, sizeof(temp.serviceCompany), slen)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "serviceAddress") == 0) {
        if (hasAddr) return SettingsError::MALFORMED; hasAddr = true;
        size_t slen; if (!parseString(c, temp.serviceAddress, sizeof(temp.serviceAddress), slen)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "servicePhone") == 0) {
        if (hasPhone) return SettingsError::MALFORMED; hasPhone = true;
        size_t slen; if (!parseString(c, temp.servicePhone, sizeof(temp.servicePhone), slen)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "serviceEmail") == 0) {
        if (hasEmail) return SettingsError::MALFORMED; hasEmail = true;
        size_t slen; if (!parseString(c, temp.serviceEmail, sizeof(temp.serviceEmail), slen)) return SettingsError::MALFORMED;
      } else if (strcmp(key, "reportLogoId") == 0) {
        if (hasLogo) return SettingsError::MALFORMED; hasLogo = true;
        size_t slen; if (!parseString(c, temp.reportLogoId, sizeof(temp.reportLogoId), slen)) return SettingsError::MALFORMED;
      } else {
        return SettingsError::MALFORMED;
      }

      if (!expectChar(c, ',')) {
        if (!expectChar(c, '}')) return SettingsError::MALFORMED;
        break;
      }
    }
  }

  skipWs(c);
  if (c.pos != c.len) return SettingsError::MALFORMED;

  if (!hasSchema || !hasLang || !hasKeepAwake || !hasTechs ||
      !hasComp || !hasAddr || !hasPhone || !hasEmail || !hasLogo) {
    return SettingsError::MALFORMED;
  }

  out = temp;
  return SettingsError::NONE;
}

// --- recovery & commit -------------------------------------------------------
SettingsError validateFile(const char* path) {
  size_t sz = 0;
  if (!SdService::fileSize(path, sz)) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
  if (sz == 0 || sz > kMaxSettingsJsonLen) return SettingsError::MALFORMED;
  size_t g = 0;
  if (!SdService::readFile(path, (uint8_t*)gReadBuf, kMaxSettingsJsonLen, g)) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
  gReadBuf[g] = '\0';
  Settings tmp;
  return deserialize(gReadBuf, g, tmp);
}

SettingsError ensureRecovered() {
  bool se = false;
  if (filePresent(kAuthPath, se)) {
    if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
    if (validateFile(kAuthPath) == SettingsError::NONE) {
      SdService::removeFile(kTmpPath); SdService::removeFile(kBakPath); return SettingsError::NONE;
    }
    return SettingsError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
  if (filePresent(kBakPath, se)) {
    if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
    if (validateFile(kBakPath) == SettingsError::NONE) {
      if (SdService::renameFile(kBakPath, kAuthPath)) { SdService::removeFile(kTmpPath); return SettingsError::NONE; }
      return SettingsError::RECOVERY_FAILED;
    }
    return SettingsError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
  if (filePresent(kTmpPath, se)) {
    if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
    if (validateFile(kTmpPath) == SettingsError::NONE) {
      if (SdService::renameFile(kTmpPath, kAuthPath)) return SettingsError::NONE;
      return SettingsError::RECOVERY_FAILED;
    }
    return SettingsError::MALFORMED;
  }
  if (se) return mapSd(SdService::lastError(), SettingsError::READ_FAILED);
  return SettingsError::NOT_FOUND;
}

SettingsError commit(const Settings& s) {
  String content = serialize(s);
  if (content.length() == 0 || content.length() > kMaxSettingsJsonLen) return SettingsError::SERIALIZATION_FAILED;

  bool se = false;
  if (filePresent(kTmpPath, se)) SdService::removeFile(kTmpPath);
  if (!SdService::writeFile(kTmpPath, (const uint8_t*)content.c_str(), content.length()))
    return mapSd(SdService::lastError(), SettingsError::WRITE_FAILED);

  size_t fsz = 0;
  if (!SdService::fileSize(kTmpPath, fsz) || fsz != content.length()) {
    SdService::removeFile(kTmpPath); return SettingsError::WRITE_FAILED;
  }
  size_t got = 0;
  if (!SdService::readFile(kTmpPath, (uint8_t*)gVerifyBuf, kMaxSettingsJsonLen, got) ||
      got != content.length() || memcmp(gVerifyBuf, content.c_str(), got) != 0) {
    SdService::removeFile(kTmpPath); return SettingsError::WRITE_FAILED;
  }

  bool authSe = false;
  const bool auth = filePresent(kAuthPath, authSe);
  if (authSe) { SdService::removeFile(kTmpPath); return SettingsError::READ_FAILED; }

  if (!auth) {
    if (!SdService::renameFile(kTmpPath, kAuthPath)) {
      SdService::removeFile(kTmpPath);
      return mapSd(SdService::lastError(), SettingsError::COMMIT_FAILED);
    }
    return SettingsError::NONE;
  }

  bool bakSe = false;
  if (filePresent(kBakPath, bakSe)) SdService::removeFile(kBakPath);
  if (!SdService::renameFile(kAuthPath, kBakPath)) {
    SdService::removeFile(kTmpPath);
    return mapSd(SdService::lastError(), SettingsError::COMMIT_FAILED);
  }
  if (!SdService::renameFile(kTmpPath, kAuthPath)) {
    SdService::renameFile(kBakPath, kAuthPath);
    SdService::removeFile(kTmpPath);
    return SettingsError::COMMIT_FAILED;
  }
  SdService::removeFile(kBakPath);
  return SettingsError::NONE;
}

} // namespace

bool begin() {
  gReady = false; gErr = SettingsError::NONE;
  if (!SdService::isReady()) { gErr = SettingsError::NOT_READY; return false; }
  if (!SdService::ensureDir("/bremsecu") || !SdService::ensureDir(kConfigDir) || !SdService::ensureDir("/bremsecu/tmp")) {
    gErr = mapSd(SdService::lastError(), SettingsError::NOT_READY); return false;
  }
  gReady = true; return true;
}
bool isReady() { return gReady; }
SettingsError lastError() { return gErr; }

void defaults(Settings& out) {
  memset(&out, 0, sizeof(out));
  strncpy(out.language, "tr", sizeof(out.language) - 1);
  out.language[sizeof(out.language) - 1] = '\0';
  out.keepScreenAwake = false;
  out.technicianCount = 0;
}

SettingsError load(Settings& out) {
  if (!gReady) { gErr = SettingsError::NOT_READY; return gErr; }
  SettingsError rec = ensureRecovered();
  if (rec == SettingsError::NOT_FOUND) { gErr = rec; return gErr; }
  if (rec != SettingsError::NONE) { gErr = rec; return gErr; }
  size_t sz = 0;
  if (!SdService::fileSize(kAuthPath, sz)) {
    gErr = mapSd(SdService::lastError(), SettingsError::READ_FAILED); return gErr;
  }
  if (sz == 0 || sz > kMaxSettingsJsonLen) { gErr = SettingsError::MALFORMED; return gErr; }
  size_t g = 0;
  if (!SdService::readFile(kAuthPath, (uint8_t*)gReadBuf, kMaxSettingsJsonLen, g)) {
    gErr = mapSd(SdService::lastError(), SettingsError::READ_FAILED); return gErr;
  }
  gReadBuf[g] = '\0';
  SettingsError e = deserialize(gReadBuf, g, out);
  gErr = e; return gErr;
}

SettingsError save(const Settings& settings) {
  if (!gReady) { gErr = SettingsError::NOT_READY; return gErr; }

  SettingsError rec = ensureRecovered();
  if (rec != SettingsError::NONE && rec != SettingsError::NOT_FOUND) {
    gErr = rec;
    return gErr;
  }

  if (!terminatedWithin(settings.language, sizeof(settings.language))) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!isLanguageSupported(settings.language)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!textOk(settings.language)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (settings.technicianCount > kMaxTechnicians) { gErr = SettingsError::INVALID_ARG; return gErr; }
  for (uint8_t i = 0; i < settings.technicianCount; ++i) {
    const Technician& t = settings.technicians[i];
    if (!terminatedWithin(t.id, sizeof(t.id)) || t.id[0] == '\0') { gErr = SettingsError::INVALID_ARG; return gErr; }
    if (!terminatedWithin(t.name, sizeof(t.name)) || t.name[0] == '\0') { gErr = SettingsError::INVALID_ARG; return gErr; }
    if (!textOk(t.id) || !textOk(t.name)) { gErr = SettingsError::INVALID_ARG; return gErr; }
    for (uint8_t k = 0; k < i; ++k) {
      if (strcmp(settings.technicians[k].id, t.id) == 0) { gErr = SettingsError::INVALID_ARG; return gErr; }
    }
  }
  if (!terminatedWithin(settings.serviceCompany, sizeof(settings.serviceCompany)) || !textOk(settings.serviceCompany)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!terminatedWithin(settings.serviceAddress, sizeof(settings.serviceAddress)) || !textOk(settings.serviceAddress)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!terminatedWithin(settings.servicePhone, sizeof(settings.servicePhone)) || !textOk(settings.servicePhone)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!terminatedWithin(settings.serviceEmail, sizeof(settings.serviceEmail)) || !textOk(settings.serviceEmail)) { gErr = SettingsError::INVALID_ARG; return gErr; }
  if (!terminatedWithin(settings.reportLogoId, sizeof(settings.reportLogoId)) || !textOk(settings.reportLogoId)) { gErr = SettingsError::INVALID_ARG; return gErr; }

  SettingsError e = commit(settings);
  gErr = e; return gErr;
}

} // namespace SettingsStore