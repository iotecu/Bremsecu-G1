#pragma once

#include <cstdint>

namespace ConfirmationLifecycle {

enum class Type : uint8_t {
  DE_ENERGIZED = 0,
  AXLE_SAFETY = 1
};

struct Slot {
  bool armed = false;
  uint8_t mode = 0;
  uint32_t issuedAtMs = 0;
};

struct Store {
  Slot deEnergized;
  Slot axleSafety;
};

constexpr uint32_t kDefaultTtlMs = 30000;

void clear(Store& store);
void revoke(Store& store, Type type);
void arm(Store& store, Type type, uint8_t mode, uint32_t nowMs);

bool isUsable(
    const Store& store,
    Type type,
    uint8_t mode,
    uint32_t nowMs,
    uint32_t ttlMs = kDefaultTtlMs);

// Returns whether a valid confirmation was available for this exact mode.
// The slot is always cleared by the attempt, so failed starts cannot retain a
// stale confirmation for a later retry.
bool consumeForStart(
    Store& store,
    Type type,
    uint8_t mode,
    uint32_t nowMs,
    uint32_t ttlMs = kDefaultTtlMs);

} // namespace ConfirmationLifecycle
