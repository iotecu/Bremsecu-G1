#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — Arduino.h (native test stub)
// Minimal Arduino stub for host-side tests.
// Only provides what interlocks.cpp needs to compile on native.
// =============================================================================

#include <cstdint>
#include <cstddef>

// Arduino type aliases used by firmware code
typedef uint8_t byte;
typedef bool boolean;

// Minimal millis() stub if needed
static inline unsigned long millis() { return 0; }