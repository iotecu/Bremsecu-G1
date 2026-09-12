// =============================================================================
// BREMSECU G1 REV-2 — tpic_control_stub.cpp
// Host-side test stub implementation. No GPIO, no hardware.
//
// This file is part of the test suite and will be compiled/linked together
// with test_main.cpp by PlatformIO. Do NOT rely on sibling-directory
// auto-discovery.
// =============================================================================

#include "tpic_control_stub.h"

namespace TpicControl {

namespace {
uint32_t gWord = 0;
uint32_t gLastWritten = 0;
} // namespace

void begin() {
  gWord = 0;
  gLastWritten = 0;
}

void write(uint32_t word) {
  gWord = word;
  gLastWritten = word;
}

uint32_t state() {
  return gWord;
}

void setBit(int bit, bool on) {
  if (bit < 0 || bit > 31) return;
  if (on) gWord |= (1UL << bit);
  else gWord &= ~(1UL << bit);
  gLastWritten = gWord;
}

void allOff() {
  gWord = 0;
  gLastWritten = 0;
}

void testReset() {
  gWord = 0;
  gLastWritten = 0;
}

uint32_t testGetLastWrittenWord() {
  return gLastWritten;
}

} // namespace TpicControl