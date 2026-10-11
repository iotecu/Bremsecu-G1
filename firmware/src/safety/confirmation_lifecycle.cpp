#include "confirmation_lifecycle.h"

namespace ConfirmationLifecycle {
namespace {

Slot& slotFor(Store& store, Type type) {
  return type == Type::DE_ENERGIZED ? store.deEnergized : store.axleSafety;
}

const Slot& slotFor(const Store& store, Type type) {
  return type == Type::DE_ENERGIZED ? store.deEnergized : store.axleSafety;
}

bool expired(const Slot& slot, uint32_t nowMs, uint32_t ttlMs) {
  if (!slot.armed) return true;
  return static_cast<uint32_t>(nowMs - slot.issuedAtMs) > ttlMs;
}

} // namespace

void clear(Store& store) {
  store.deEnergized = Slot{};
  store.axleSafety = Slot{};
}

void revoke(Store& store, Type type) {
  slotFor(store, type) = Slot{};
}

void arm(Store& store, Type type, uint8_t mode, uint32_t nowMs) {
  Slot& slot = slotFor(store, type);
  slot.armed = true;
  slot.mode = mode;
  slot.issuedAtMs = nowMs;
}

bool isUsable(
    const Store& store,
    Type type,
    uint8_t mode,
    uint32_t nowMs,
    uint32_t ttlMs) {
  const Slot& slot = slotFor(store, type);
  return slot.armed && slot.mode == mode && !expired(slot, nowMs, ttlMs);
}

bool consumeForStart(
    Store& store,
    Type type,
    uint8_t mode,
    uint32_t nowMs,
    uint32_t ttlMs) {
  const bool accepted = isUsable(store, type, mode, nowMs, ttlMs);
  revoke(store, type);
  return accepted;
}

} // namespace ConfirmationLifecycle
