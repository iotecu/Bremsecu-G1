#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — pulse_monitor.h
// Edge/pulse EVIDENCE acquisition for the two CD40106-conditioned turn-signal
// lines. Evidence only: this module never reads analog voltage and never
// classifies (no PASS / FAIL / KISA / KOPUK decisions here).
//
// AUTHORITY:
//   - MASTER NET MAP v1.3 §6        (15P_SAG_SINYAL -> CD40106 1Y -> SAG_PULS
//                                    -> GPIO36/VP; 15P_SOL_SINYAL -> CD40106 2Y
//                                    -> SOL_PULS -> GPIO39/VN)
//   - docs/engineering/gpio-net-map.md ("Pulse GPIO mapping ... REV-2 verified
//                                    and must not be swapped by assumption")
//   - docs/engineering/measurement-methods.md ("Pulse detection must be
//                                    treated separately from DC voltage
//                                    classification")
//
// BEHAVIOR:
//   - The CHANGE ISR captures edge timing / count evidence ONLY.
//   - The current digital level is read LIVE from the physical pin at
//     snapshot() time; no level state is derived or stored in the ISR.
//   - Shared ISR/task state is protected with a portMUX_TYPE spinlock using
//     taskENTER_CRITICAL / taskEXIT_CRITICAL and their ISR-safe variants.
//
// DELIBERATELY NOT HERE:
//   - NO analog voltage sampling (AdcService owns that; the same nets are also
//     measurable through the MUX/ADS path).
//   - NO diagnostic classification or thresholds (DIAGNOSTIC_RULES / test
//     engine own classification; the window below is an evidence parameter).
//   - Window value is a PROVISIONAL scaffold value, NOT production-final.
// =============================================================================

#include <cstdint>
#include "channels.h"

namespace PulseMonitor {

enum class PulseInput : uint8_t {
  SAG = 0,  // right turn signal (GPIO36 / VP)
  SOL = 1   // left  turn signal (GPIO39 / VN)
};

constexpr uint8_t kPulseInputCount = 2;

// Named configurable evidence parameter. PROVISIONAL scaffold default;
// PENDING bench/vehicle characterization. Shapes evidence queries only;
// it is NOT a diagnostic threshold.
struct PulseConfig {
  uint32_t activityWindowMs = 1100;
};

// Immutable edge/level evidence snapshot.
struct PulseEvidence {
  bool     level;          // live digital level read from the pin at snapshot
  bool     everSeenEdge;   // at least one edge since begin()/reset()
  uint32_t lastEdgeAgeMs;  // meaningful only if everSeenEdge == true
  uint32_t edgeCount;      // edges since begin()/reset() (saturating)
  uint32_t sinceResetMs;   // grace handling lives in the classifier, not here
};

// Configure GPIOs (input, no pull), clear evidence state, attach CHANGE ISRs.
bool begin(const PulseConfig& cfg = PulseConfig{});
bool isReady();

constexpr bool isValidPulseInput(PulseInput in) {
  return static_cast<uint8_t>(in) < kPulseInputCount;
}

// Frozen identity (NET MAP §6): the MUX/ADS channel carrying the analog
// counterpart of each pulse input (for later evidence correlation).
constexpr Channels::AdcChannel companionChannelFor(PulseInput in) {
  return (in == PulseInput::SAG)
           ? Channels::AdcChannel::MUX_15P_SAG_SINYAL
           : ((in == PulseInput::SOL)
                ? Channels::AdcChannel::MUX_15P_SOL_SINYAL
                : Channels::kNoChannel);
}

// Non-blocking evidence snapshot. False for invalid input or before begin().
bool snapshot(PulseInput in, PulseEvidence& out);

// Evidence query only: an edge was seen within the configured activity
// window. NOT a diagnostic verdict.
bool hasRecentActivity(PulseInput in);

// Clear edge bookkeeping (e.g. at test start).
void reset(PulseInput in);
void resetAll();

} // namespace PulseMonitor
