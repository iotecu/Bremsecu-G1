#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — json_lite.h
// Minimal transport-level extractors for the FIXED, small API request schemas.
// NOT a general-purpose JSON parser; intentional and documented limitation.
// Used only by the HTTP layer; never by safety or test-engine code.
//
// Hardening rules:
//   - strings must end at a closing quote followed by a value terminator;
//     trailing garbage after a string value is rejected.
//   - booleans must be complete JSON tokens (true/false) followed by a value
//     terminator; prefixes like "trueXYZ" are rejected.
//   - unsigned integers must be non-negative, fully consumed, terminated by a
//     delimiter, and overflow is rejected (no silent truncation).
//   - hasKey() lets callers distinguish "field absent" (allowed default) from
//     "field present" (value must then parse strictly).
// =============================================================================

#include <Arduino.h>
#include <cstdlib>
#include <cstring>
#include <cerrno>

namespace JsonLite {

namespace detail {

inline bool findKey(const String& body, const char* key, size_t& valuePos) {
  const String needle = String("\"") + key + "\"";
  const int idx = body.indexOf(needle);
  if (idx < 0) return false;
  size_t i = (size_t)idx + needle.length();
  while (i < body.length() &&
         (body[i] == ' ' || body[i] == '\t' || body[i] == '\n' || body[i] == '\r')) ++i;
  if (i >= body.length() || body[i] != ':') return false;
  ++i;
  while (i < body.length() &&
         (body[i] == ' ' || body[i] == '\t' || body[i] == '\n' || body[i] == '\r')) ++i;
  if (i >= body.length()) return false;
  valuePos = i;
  return true;
}

// A JSON value must end at end-of-input or at a structural delimiter /
// whitespace. Anything else (e.g. "trueXYZ", "123abc", "iso\"x") is malformed.
inline bool isValueTerminator(char c) {
  return c == '\0' || c == ',' || c == '}' || c == ']' ||
         c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

} // namespace detail

// True when the key exists with a value position (value may still be malformed;
// use the typed getters for strict parsing).
inline bool hasKey(const String& body, const char* key) {
  size_t p = 0;
  return detail::findKey(body, key, p);
}

inline bool getString(const String& body, const char* key, String& out) {
  size_t p = 0;
  if (!detail::findKey(body, key, p)) return false;
  if (body[p] != '"') return false;
  out = "";
  for (size_t i = p + 1; i < body.length(); ++i) {
    const char c = body[i];
    if (c == '\\' && i + 1 < body.length()) { ++i; out += body[i]; continue; }
    if (c == '"') {
      // Require a valid terminator after the closing quote; reject trailing
      // garbage such as "iso7638_voltage"XYZ.
      const char next = (i + 1 < body.length()) ? (char)body[i + 1] : '\0';
      if (!detail::isValueTerminator(next)) return false;
      return true;
    }
    out += c;
    if (out.length() > 64) return false;  // bounded resource guard
  }
  return false;
}

// Accepts ONLY the complete tokens "true" / "false".
inline bool getBool(const String& body, const char* key, bool& out) {
  size_t p = 0;
  if (!detail::findKey(body, key, p)) return false;
  const char* s = body.c_str() + p;
  if (strncmp(s, "true", 4) == 0 && detail::isValueTerminator(s[4])) {
    out = true;
    return true;
  }
  if (strncmp(s, "false", 5) == 0 && detail::isValueTerminator(s[5])) {
    out = false;
    return true;
  }
  return false;
}

// Accepts decimal or 0x-prefixed hex (base 0), unsigned only.
// Rejects: signs, no digits, overflow, and trailing non-delimiter characters.
inline bool getUint32(const String& body, const char* key, uint32_t& out) {
  size_t p = 0;
  if (!detail::findKey(body, key, p)) return false;
  const char* start = body.c_str() + p;
  if (*start == '-' || *start == '+') return false;  // unsigned only
  errno = 0;
  char* end = nullptr;
  const unsigned long v = strtoul(start, &end, 0);
  if (end == start) return false;              // no digits consumed
  if (errno == ERANGE) return false;           // overflow, no truncation
  if (v > 0xFFFFFFFFUL) return false;          // uint32 bound
  if (!detail::isValueTerminator(*end)) return false;  // trailing garbage
  out = (uint32_t)v;
  return true;
}

} // namespace JsonLite
