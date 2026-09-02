#include <Arduino.h>
#include "tpic_map.h"

namespace TpicControl {
uint32_t state();
void write(uint32_t word);
void allOff();
}

namespace {
constexpr uint32_t bitMask(int bit) { return 1UL << bit; }

constexpr uint32_t CAN_MASK =
    bitMask(TpicBit::K2_CAN7638_CK) |
    bitMask(TpicBit::K3_CAN12098_CK) |
    bitMask(TpicBit::K4_CAN7638_DR) |
    bitMask(TpicBit::K5_CAN12098_DR);

bool oneOrZeroBits(uint32_t value) {
  return value == 0 || (value & (value - 1)) == 0;
}
}

namespace SafetyInterlocks {

void begin() {
  TpicControl::allOff();
}

bool requestOutputWord(uint32_t requested) {
  const uint32_t canBits = requested & CAN_MASK;
  if (!oneOrZeroBits(canBits)) return false;

  TpicControl::write(requested);
  return true;
}

bool selectCanRelay(int relayBit) {
  if (relayBit != TpicBit::K2_CAN7638_CK &&
      relayBit != TpicBit::K3_CAN12098_CK &&
      relayBit != TpicBit::K4_CAN7638_DR &&
      relayBit != TpicBit::K5_CAN12098_DR) {
    return false;
  }

  uint32_t next = TpicControl::state() & ~CAN_MASK;
  TpicControl::write(next); // mandatory all-CAN-off transition
  delay(5);
  next |= bitMask(relayBit);
  return requestOutputWord(next);
}

void clearCanSelection() {
  requestOutputWord(TpicControl::state() & ~CAN_MASK);
}

void faultSafe() {
  TpicControl::allOff();
}

}
