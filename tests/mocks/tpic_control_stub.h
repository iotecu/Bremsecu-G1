#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — tpic_control_stub.h
// Host-side test stub for TpicControl. No GPIO, no hardware.
// Package 1 host-side test infrastructure.
// =============================================================================

#include <cstdint>

namespace TpicControl {

void begin();
void write(uint32_t word);
uint32_t state();
void setBit(int bit, bool on);
void allOff();

// Test-only helpers
void testReset();
uint32_t testGetLastWrittenWord();

} // namespace TpicControl