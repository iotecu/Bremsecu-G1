#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — api_json.h
// Single reusable JSON string escaping for ALL API responses.
// Escapes: quote, backslash, newline, carriage return, tab.
// =============================================================================

#include <Arduino.h>

inline void jsonEscapeAppend(String& out, const char* v) {
  for (const char* p = v; *p; ++p) {
    switch (*p) {
      case '"':  out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n";  break;
      case '\r': out += "\\r";  break;
      case '\t': out += "\\t";  break;
      default:   out += *p;     break;
    }
  }
}

inline void jsonPutStr(String& out, const char* key, const char* v) {
  out += "\""; out += key; out += "\":\""; jsonEscapeAppend(out, v); out += "\"";
}