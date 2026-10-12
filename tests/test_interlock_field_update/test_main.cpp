// =============================================================================
// BREMSECU G1 REV-2 — test_main.cpp
// Package 1 host-side tests for TPIC interlock field-update semantics.
// No ESP32 GPIO required. Uses TpicControl stub.
//
// Test suite: tests/test_interlock_field_update/
// =============================================================================

#include <cstdio>
#include <cstdlib>
#include <cstdint>

#include "Arduino.h"
#include "tpic_control_stub.h"
#include "tpic_map.h"
#include "safety_interlocks.h"

// interlocks.cpp implementation is compiled by PlatformIO via build_src_filter.
// Do NOT #include the .cpp file here to avoid double compilation.

// ---------------------------------------------------------------------------
// Test counters - properly separated
// ---------------------------------------------------------------------------
static int testCasesRun = 0;
static int testCasesPassed = 0;
static int assertionsRun = 0;

#define TEST(name) \
  static void test_##name(); \
  static void run_test_##name() { \
    printf("TEST: %s ... ", #name); \
    fflush(stdout); \
    TpicControl::testReset(); \
    SafetyInterlocks::begin(); \
    testCasesRun++; \
    test_##name(); \
    printf("PASS\n"); \
    testCasesPassed++; \
  } \
  static void test_##name()

#define ASSERT_TRUE(cond) \
  do { \
    assertionsRun++; \
    if (!(cond)) { \
      printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n", #cond, __FILE__, __LINE__); \
      fflush(stdout); \
      exit(1); \
    } \
  } while(0)

#define ASSERT_EQ(a, b) \
  do { \
    assertionsRun++; \
    if ((a) != (b)) { \
      printf("FAIL\n  Expected: 0x%08X, Got: 0x%08X\n  at %s:%d\n", \
             (unsigned)(b), (unsigned)(a), __FILE__, __LINE__); \
      fflush(stdout); \
      exit(1); \
    } \
  } while(0)

#define ASSERT_FALSE(cond) ASSERT_TRUE(!(cond))

// ---------------------------------------------------------------------------
// Test cases — 13 invariants
// ---------------------------------------------------------------------------

TEST(k6_on_can_on_cable_output_preserves_k6_and_can) {
  // Setup: K6 ON, K2 CAN relay ON
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  SafetyInterlocks::energizeCanRelay(TpicBit::K2_CAN7638_CK);

  uint32_t before = TpicControl::state();
  ASSERT_TRUE((before & (1UL << TpicBit::K6_MASTER_GND)) != 0);
  ASSERT_TRUE((before & (1UL << TpicBit::K2_CAN7638_CK)) != 0);

  // Apply cable output
  bool ok = SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT1_AKU1);
  ASSERT_TRUE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT1_AKU1)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::K6_MASTER_GND)) != 0);  // K6 preserved
  ASSERT_TRUE((after & (1UL << TpicBit::K2_CAN7638_CK)) != 0);  // CAN preserved
}

TEST(k1_on_cable_output_turns_k1_off) {
  // Setup: K1 ON (simulating load state)
  TpicControl::setBit(TpicBit::K1_SELECT_V, true);
  ASSERT_TRUE((TpicControl::state() & (1UL << TpicBit::K1_SELECT_V)) != 0);

  // Apply cable output
  bool ok = SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT1_AKU1);
  ASSERT_TRUE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT1_AKU1)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::K1_SELECT_V)) == 0);  // K1 OFF
}

TEST(cable_output_switch_clears_previous) {
  // Apply first cable output
  bool ok1 = SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT1_AKU1);
  ASSERT_TRUE(ok1);
  ASSERT_TRUE((TpicControl::state() & (1UL << TpicBit::OUT1_AKU1)) != 0);

  // Switch to second cable output
  bool ok2 = SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT2_KONTAK);
  ASSERT_TRUE(ok2);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT2_KONTAK)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::OUT1_AKU1)) == 0);  // Previous cleared
}

TEST(k6_toggle_does_not_change_cable_output) {
  // Apply cable output
  bool ok = SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT1_AKU1);
  ASSERT_TRUE(ok);

  // Toggle K6 ON
  bool okK6 = SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  ASSERT_TRUE(okK6);

  uint32_t afterK6On = TpicControl::state();
  ASSERT_TRUE((afterK6On & (1UL << TpicBit::OUT1_AKU1)) != 0);  // Cable preserved

  // Toggle K6 OFF
  bool okK6Off = SafetyInterlocks::applyMeasurementReference(0);
  ASSERT_TRUE(okK6Off);

  uint32_t afterK6Off = TpicControl::state();
  ASSERT_TRUE((afterK6Off & (1UL << TpicBit::OUT1_AKU1)) != 0);  // Cable still preserved
  ASSERT_TRUE((afterK6Off & (1UL << TpicBit::K6_MASTER_GND)) == 0);
}

TEST(k6_can_on_load_output_preserves_both_and_k1_on) {
  // Setup: K6 ON, K3 CAN relay ON
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  SafetyInterlocks::energizeCanRelay(TpicBit::K3_CAN12098_CK);

  uint32_t before = TpicControl::state();
  ASSERT_TRUE((before & (1UL << TpicBit::K6_MASTER_GND)) != 0);
  ASSERT_TRUE((before & (1UL << TpicBit::K3_CAN12098_CK)) != 0);

  // Apply load output
  bool ok = SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT8_SOL_SINYAL);
  ASSERT_TRUE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT8_SOL_SINYAL)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::K6_MASTER_GND)) != 0);  // K6 preserved
  ASSERT_TRUE((after & (1UL << TpicBit::K3_CAN12098_CK)) != 0);  // CAN preserved
  ASSERT_TRUE((after & (1UL << TpicBit::K1_SELECT_V)) != 0);  // K1 ON
}

TEST(load_output_clears_stale_cable_output) {
  // Setup: stale cable output
  SafetyInterlocks::applyCableTestOutput(1UL << TpicBit::OUT1_AKU1);
  ASSERT_TRUE((TpicControl::state() & (1UL << TpicBit::OUT1_AKU1)) != 0);

  // Apply load output
  bool ok = SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT14_STOP);
  ASSERT_TRUE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT14_STOP)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::OUT1_AKU1)) == 0);  // Stale cable cleared
  ASSERT_TRUE((after & (1UL << TpicBit::K1_SELECT_V)) != 0);  // K1 ON
}

TEST(load_output_switch_only_new_active) {
  // Apply first load output
  bool ok1 = SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT8_SOL_SINYAL);
  ASSERT_TRUE(ok1);

  // Switch to second load output
  bool ok2 = SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT14_STOP);
  ASSERT_TRUE(ok2);

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::OUT14_STOP)) != 0);
  ASSERT_TRUE((after & (1UL << TpicBit::OUT8_SOL_SINYAL)) == 0);  // Previous cleared
}

TEST(second_can_relay_rejected_state_unchanged) {
  // Energize first CAN relay
  bool ok1 = SafetyInterlocks::energizeCanRelay(TpicBit::K2_CAN7638_CK);
  ASSERT_TRUE(ok1);
  uint32_t before = TpicControl::state();

  // Try to energize second CAN relay
  bool ok2 = SafetyInterlocks::energizeCanRelay(TpicBit::K4_CAN7638_DR);
  ASSERT_FALSE(ok2);  // Rejected

  uint32_t after = TpicControl::state();
  ASSERT_EQ(after, before);  // State unchanged
}

TEST(invalid_cable_mask_rejected_state_unchanged) {
  // Setup: some state
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  uint32_t before = TpicControl::state();

  // Invalid: multiple cable bits
  bool ok = SafetyInterlocks::applyCableTestOutput(
      (1UL << TpicBit::OUT1_AKU1) | (1UL << TpicBit::OUT2_KONTAK));
  ASSERT_FALSE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_EQ(after, before);  // State unchanged
}

TEST(invalid_load_mask_rejected_state_unchanged) {
  uint32_t before = TpicControl::state();

  // Invalid: multiple load bits
  bool ok = SafetyInterlocks::applyLoadOutput(
      (1UL << TpicBit::OUT8_SOL_SINYAL) | (1UL << TpicBit::OUT14_STOP));
  ASSERT_FALSE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_EQ(after, before);  // State unchanged
}

TEST(invalid_reference_mask_rejected_state_unchanged) {
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  uint32_t before = TpicControl::state();

  // Invalid: not K6
  bool ok = SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K1_SELECT_V);
  ASSERT_FALSE(ok);

  uint32_t after = TpicControl::state();
  ASSERT_EQ(after, before);  // State unchanged
}

TEST(clear_can_selection_preserves_k1_k6_outputs) {
  // Setup: K1 ON, K6 ON, load output, CAN relay
  SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT8_SOL_SINYAL);  // Sets K1
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  SafetyInterlocks::energizeCanRelay(TpicBit::K2_CAN7638_CK);

  uint32_t before = TpicControl::state();
  ASSERT_TRUE((before & (1UL << TpicBit::K1_SELECT_V)) != 0);
  ASSERT_TRUE((before & (1UL << TpicBit::K6_MASTER_GND)) != 0);
  ASSERT_TRUE((before & (1UL << TpicBit::OUT8_SOL_SINYAL)) != 0);

  // Clear CAN selection
  SafetyInterlocks::clearCanSelection();

  uint32_t after = TpicControl::state();
  ASSERT_TRUE((after & (1UL << TpicBit::K2_CAN7638_CK)) == 0);  // CAN cleared
  ASSERT_TRUE((after & (1UL << TpicBit::K1_SELECT_V)) != 0);  // K1 preserved
  ASSERT_TRUE((after & (1UL << TpicBit::K6_MASTER_GND)) != 0);  // K6 preserved
  ASSERT_TRUE((after & (1UL << TpicBit::OUT8_SOL_SINYAL)) != 0);  // Output preserved
}

TEST(fault_safe_zeroes_all_32_bits) {
  // Setup: various bits ON
  SafetyInterlocks::applyLoadOutput(1UL << TpicBit::OUT8_SOL_SINYAL);
  SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND);
  SafetyInterlocks::energizeCanRelay(TpicBit::K2_CAN7638_CK);

  uint32_t before = TpicControl::state();
  ASSERT_TRUE(before != 0);

  // Fault safe
  SafetyInterlocks::faultSafe();

  uint32_t after = TpicControl::state();
  ASSERT_EQ(after, 0);  // All 32 bits zero
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
int main() {
  printf("=== Package 1: TPIC Interlock Field-Update Semantics Tests ===\n\n");

  run_test_k6_on_can_on_cable_output_preserves_k6_and_can();
  run_test_k1_on_cable_output_turns_k1_off();
  run_test_cable_output_switch_clears_previous();
  run_test_k6_toggle_does_not_change_cable_output();
  run_test_k6_can_on_load_output_preserves_both_and_k1_on();
  run_test_load_output_clears_stale_cable_output();
  run_test_load_output_switch_only_new_active();
  run_test_second_can_relay_rejected_state_unchanged();
  run_test_invalid_cable_mask_rejected_state_unchanged();
  run_test_invalid_load_mask_rejected_state_unchanged();
  run_test_invalid_reference_mask_rejected_state_unchanged();
  run_test_clear_can_selection_preserves_k1_k6_outputs();
  run_test_fault_safe_zeroes_all_32_bits();

  printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",
         testCasesPassed, testCasesRun, assertionsRun);

  return (testCasesPassed == testCasesRun) ? 0 : 1;
}