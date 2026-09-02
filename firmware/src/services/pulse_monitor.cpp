// =============================================================================
// BREMSECU G1 REV-2 — pulse_monitor.cpp
// Interrupt-driven edge evidence + live level sampling for SAG_PULS /
// SOL_PULS. No analog reads, no classification, no thresholds.
// =============================================================================

#include "pulse_monitor.h"
#include "pins.h"

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

namespace PulseMonitor {

namespace {

// REV-2 verified mapping (gpio-net-map.md): must not be swapped by assumption.
constexpr int kPulseGpio[kPulseInputCount] = {
  Pins::SAG_PULS,  // index 0 = SAG (GPIO36 / VP)
  Pins::SOL_PULS   // index 1 = SOL (GPIO39 / VN)
};

struct PulseState {
  volatile uint32_t lastEdgeUs;
  volatile uint32_t edgeCount;
  uint32_t          resetMs;
};

PulseState  gState[kPulseInputCount];
PulseConfig gCfg;
bool        gReady = false;

// Spinlock guarding ISR/task shared evidence state.
portMUX_TYPE gCrit = portMUX_INITIALIZER_UNLOCKED;

// CHANGE ISR: edge timing / count evidence ONLY.
// No GPIO level derivation here; snapshot() reads the live pin level.
void IRAM_ATTR onEdge(uint8_t idx) {
  PulseState& st = gState[idx];
  taskENTER_CRITICAL_ISR(&gCrit);
  st.lastEdgeUs = (uint32_t)micros();  // IRAM-safe
  if (st.edgeCount != 0xFFFFFFFFu) st.edgeCount++;  // saturating
  taskEXIT_CRITICAL_ISR(&gCrit);
}

void IRAM_ATTR onEdgeSag() { onEdge(0); }
void IRAM_ATTR onEdgeSol() { onEdge(1); }

} // namespace

bool begin(const PulseConfig& cfg) {
  gCfg = cfg;
  for (uint8_t i = 0; i < kPulseInputCount; ++i) {
    pinMode(kPulseGpio[i], INPUT);
    gState[i].lastEdgeUs = 0;
    gState[i].edgeCount  = 0;
    gState[i].resetMs    = millis();
  }
  attachInterrupt(digitalPinToInterrupt(kPulseGpio[0]), onEdgeSag, CHANGE);
  attachInterrupt(digitalPinToInterrupt(kPulseGpio[1]), onEdgeSol, CHANGE);
  gReady = true;
  return true;
}

bool isReady() { return gReady; }

bool snapshot(PulseInput in, PulseEvidence& out) {
  if (!gReady || !isValidPulseInput(in)) return false;
  const uint8_t idx = static_cast<uint8_t>(in);
  PulseState& st = gState[idx];

  uint32_t lastUs;
  uint32_t edges;
  uint32_t resetMs;
  taskENTER_CRITICAL(&gCrit);
  lastUs  = st.lastEdgeUs;
  edges   = st.edgeCount;
  resetMs = st.resetMs;
  taskEXIT_CRITICAL(&gCrit);

  const uint32_t nowUs = (uint32_t)micros();
  const uint32_t nowMs = (uint32_t)millis();

  out.level = (digitalRead(kPulseGpio[idx]) != 0);
  out.everSeenEdge  = (edges != 0);
  out.lastEdgeAgeMs = out.everSeenEdge ? ((nowUs - lastUs) / 1000u)
                                       : 0xFFFFFFFFu;
  out.edgeCount     = edges;
  out.sinceResetMs  = nowMs - resetMs;
  return true;
}

bool hasRecentActivity(PulseInput in) {
  PulseEvidence ev;
  if (!snapshot(in, ev)) return false;
  return ev.everSeenEdge && (ev.lastEdgeAgeMs <= gCfg.activityWindowMs);
}

void reset(PulseInput in) {
  if (!isValidPulseInput(in)) return;
  PulseState& st = gState[static_cast<uint8_t>(in)];
  taskENTER_CRITICAL(&gCrit);
  st.lastEdgeUs = 0;
  st.edgeCount  = 0;
  st.resetMs    = millis();
  taskEXIT_CRITICAL(&gCrit);
}

void resetAll() {
  for (uint8_t i = 0; i < kPulseInputCount; ++i) {
    reset(static_cast<PulseInput>(i));
  }
}

static_assert(kPulseGpio[0] == 36 && kPulseGpio[1] == 39,
              "pulse GPIO mapping is REV-2 verified; must not be swapped");

} // namespace PulseMonitor
