#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — tpic_control.h
// TPIC shift-register chain control (physical chain U6->U5->U4->U3, 32-bit word).
// This is a LOW-LEVEL hardware abstraction ONLY.
// All application-level output decisions MUST go through SafetyInterlocks.
// =============================================================================

#include <cstdint>

namespace TpicControl {

// Initialize TPIC pins and latch all-zeros before enabling outputs.
void begin();

// Write a complete 32-bit output word to the shift register chain.
void write(uint32_t word);

// Return the current latched output word (read from internal state, not hardware).
uint32_t state();

// Set or clear a single bit in the output word and latch immediately.
// bit: 0..31
void setBit(int bit, bool on);

// Latch all zeros (safe state).
void allOff();

} // namespace TpicControl
