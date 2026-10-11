// =============================================================================
// BREMSECU G1 REV-2 — interlocks.cpp
// Hardware interlock enforcement. ALL TPIC words flow through this file.
// The generic word writer is file-internal; only guarded intents are exported.
//
// PACKAGE 1 FIELD-UPDATE SEMANTICS:
//   applyCableTestOutput()    : field-update, preserves K6/CAN/unrelated state
//   applyMeasurementReference(): K6-only field update
//   applyLoadOutput()         : clears cable outputs, sets load output + K1
//
// K1 cable-test'te OFF olmalı (cable test yalnızca 3.3V).
// K1 load output'ta ON olmalı (load 24V).
// K6 ve CAN selection her zaman korunmalı.
// =============================================================================

#include <Arduino.h>
#include "tpic_map.h"
#include "tpic_control.h"
#include "safety_interlocks.h"

namespace {

// ---------------------------------------------------------------------------
// Masks and constants
// ---------------------------------------------------------------------------
const uint32_t K1_BIT = 1UL << TpicBit::K1_SELECT_V;
const uint32_t K6_BIT = 1UL << TpicBit::K6_MASTER_GND;

const uint32_t CAN_MASK =
    (1UL << TpicBit::K2_CAN7638_CK) |
    (1UL << TpicBit::K3_CAN12098_CK) |
    (1UL << TpicBit::K4_CAN7638_DR) |
    (1UL << TpicBit::K5_CAN12098_DR);

const uint32_t CABLE_OUTPUT_MASK =
    (1UL << TpicBit::OUT1_AKU1)    | (1UL << TpicBit::OUT2_KONTAK)   |
    (1UL << TpicBit::OUT3_GND1)    | (1UL << TpicBit::OUT4_GND2)     |
    (1UL << TpicBit::OUT5_ABS)     | (1UL << TpicBit::OUT6_CANH1_DR) |
    (1UL << TpicBit::OUT7_CANL1_DR)| (1UL << TpicBit::OUT8_SOL_SINYAL) |
    (1UL << TpicBit::OUT9_SAG_SINYAL) | (1UL << TpicBit::OUT10_ARKA_SIS) |
    (1UL << TpicBit::OUT11_GND3)   | (1UL << TpicBit::OUT12_SOL_PARK) |
    (1UL << TpicBit::OUT13_SAG_PARK) | (1UL << TpicBit::OUT14_STOP)    |
    (1UL << TpicBit::OUT15_GERI)   | (1UL << TpicBit::OUT16_AKU2)    |
    (1UL << TpicBit::OUT17_BALATA)  | (1UL << TpicBit::OUT18_YAYLI)   |
    (1UL << TpicBit::OUT19_ASANSOR) | (1UL << TpicBit::OUT20_GND4)    |
    (1UL << TpicBit::OUT21_CANH2_DR)| (1UL << TpicBit::OUT22_CANL2_DR);

const uint32_t LOAD_OUTPUT_MASK =
    (1UL << TpicBit::OUT8_SOL_SINYAL) | (1UL << TpicBit::OUT9_SAG_SINYAL) |
    (1UL << TpicBit::OUT10_ARKA_SIS)  | (1UL << TpicBit::OUT12_SOL_PARK)  |
    (1UL << TpicBit::OUT13_SAG_PARK)    | (1UL << TpicBit::OUT14_STOP)      |
    (1UL << TpicBit::OUT15_GERI)      | (1UL << TpicBit::OUT19_ASANSOR);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
bool oneOrZeroBits(uint32_t value) {
  return value == 0 || (value & (value - 1)) == 0;
}

bool requestedOutputWord(uint32_t requested) {
  const uint32_t canBits = requested & CAN_MASK;
  if (!oneOrZeroBits(canBits)) return false;  // at most one CAN relay, always
  TpicControl::write(requested);
  return true;
}

} // namespace

namespace SafetyInterlocks {

void begin() {
  TpicControl::allOff();
}

void clearCanSelection() {
  const uint32_t cur = TpicControl::state();
  const uint32_t next = cur & ~CAN_MASK;
  requestedOutputWord(next);
}

bool energizeCanRelay(int relayBit) {
  if (relayBit != TpicBit::K2_CAN7638_CK &&
      relayBit != TpicBit::K3_CAN12098_CK &&
      relayBit != TpicBit::K4_CAN7638_DR &&
      relayBit != TpicBit::K5_CAN12098_DR) {
    return false;
  }
  const uint32_t cur = TpicControl::state();
  // Only allow energize if no CAN relay is currently ON
  if ((cur & CAN_MASK) != 0) return false;
  const uint32_t next = cur | (1UL << relayBit);
  return requestedOutputWord(next);
}

void faultSafe() {
  TpicControl::allOff();
}

// ---------------------------------------------------------------------------
// PACKAGE 1: Field-update semantics
// ---------------------------------------------------------------------------

bool applyCableTestOutput(uint32_t cableOutputBits) {
  // Validate: only 0 or 1 bit within CABLE_OUTPUT_MASK
  if (cableOutputBits & ~CABLE_OUTPUT_MASK) return false;
  if (!oneOrZeroBits(cableOutputBits)) return false;

  // Read current state
  const uint32_t cur = TpicControl::state();

  // Field update: clear all cable/output bits AND K1, then set requested cable bit.
  // K1 MUST be OFF because cable test is 3.3V only.
  // K6 and CAN selection are preserved.
  const uint32_t next = (cur & ~(CABLE_OUTPUT_MASK | K1_BIT)) | cableOutputBits;

  return requestedOutputWord(next);
}

bool applyMeasurementReference(uint32_t bits) {
  // Validate: only 0 or K6_BIT
  if (bits != 0 && bits != K6_BIT) return false;

  // Read current state
  const uint32_t cur = TpicControl::state();

  // K6-only field update. Cable/load outputs, K1, and CAN selection preserved.
  const uint32_t next = (cur & ~K6_BIT) | bits;

  return requestedOutputWord(next);
}

bool applyLoadOutput(uint32_t loadOutputBits) {
  // Validate: exactly 1 bit within LOAD_OUTPUT_MASK, 0 rejected
  if (loadOutputBits == 0) return false;
  if (loadOutputBits & ~LOAD_OUTPUT_MASK) return false;
  if (!oneOrZeroBits(loadOutputBits)) return false;

  // Read current state
  const uint32_t cur = TpicControl::state();

  // Field update: clear ALL cable/output bits (including stale non-load outputs),
  // set requested load output, and turn K1 ON.
  // K1 MUST be ON because load outputs are 24V.
  // K6 and CAN selection are preserved.
  const uint32_t next = (cur & ~(CABLE_OUTPUT_MASK | LOAD_OUTPUT_MASK)) | loadOutputBits | K1_BIT;

  return requestedOutputWord(next);
}

} // namespace SafetyInterlocks