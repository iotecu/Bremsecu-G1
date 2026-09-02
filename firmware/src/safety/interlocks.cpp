#include <Arduino.h>
#include "tpic_map.h"
#include "tpic_control.h"
#include "safety_interlocks.h"

namespace {
const uint32_t bitMask(int bit) { return 1UL << bit; }
const uint32_t CAN_MASK = bitMask(TpicBit::K2_CAN7638_CK) | bitMask(TpicBit::K3_CAN12098_CK) | bitMask(TpicBit::K4_CAN7638_DR) | bitMask(TpicBit::K5_CAN12098_DR);
const uint32_t K1_BIT = bitMask(TpicBit::K1_SELECT_V);
const uint32_t K6_BIT = bitMask(TpicBit::K6_MASTER_GND);
const uint32_t CABLE_OUTPUT_MASK =
    bitMask(TpicBit::OUT1_AKU1) | bitMask(TpicBit::OUT2_KONTAK) | bitMask(TpicBit::OUT3_GND1) | bitMask(TpicBit::OUT4_GND2) |
    bitMask(TpicBit::OUT5_ABS) | bitMask(TpicBit::OUT6_CANH1_DR) | bitMask(TpicBit::OUT7_CANL1_DR) | bitMask(TpicBit::OUT8_SOL_SINYAL) |
    bitMask(TpicBit::OUT9_SAG_SINYAL) | bitMask(TpicBit::OUT10_ARKA_SIS) | bitMask(TpicBit::OUT11_GND3) | bitMask(TpicBit::OUT12_SOL_PARK) |
    bitMask(TpicBit::OUT13_SAG_PARK) | bitMask(TpicBit::OUT14_STOP) | bitMask(TpicBit::OUT15_GERI) | bitMask(TpicBit::OUT16_AKU2) |
    bitMask(TpicBit::OUT17_BALATA) | bitMask(TpicBit::OUT18_YAYLI) | bitMask(TpicBit::OUT19_ASANSOR) | bitMask(TpicBit::OUT20_GND4) |
    bitMask(TpicBit::OUT21_CANH2_DR) | bitMask(TpicBit::OUT22_CANL2_DR);
const uint32_t LOAD_OUTPUT_MASK =
    bitMask(TpicBit::OUT8_SOL_SINYAL) | bitMask(TpicBit::OUT9_SAG_SINYAL) | bitMask(TpicBit::OUT10_ARKA_SIS) |
    bitMask(TpicBit::OUT12_SOL_PARK) | bitMask(TpicBit::OUT13_SAG_PARK) | bitMask(TpicBit::OUT14_STOP) |
    bitMask(TpicBit::OUT15_GERI) | bitMask(TpicBit::OUT19_ASANSOR);

bool oneOrZeroBits(uint32_t value) { return value == 0 || (value & (value - 1)) == 0; }
bool requestedOutputWord(uint32_t requested) {
  const uint32_t canBits = requested & CAN_MASK;
  if (!oneOrZeroBits(canBits)) return false;
  TpicControl::write(requested);
  return true;
}
}

namespace SafetyInterlocks {
void begin() { TpicControl::allOff(); }
void clearCanSelection() { requestedOutputWord(TpicControl::state() & ~CAN_MASK); }
bool energizeCanRelay(int relayBit) {
  if (relayBit != TpicBit::K2_CAN7638_CK && relayBit != TpicBit::K3_CAN12098_CK && relayBit != TpicBit::K4_CAN7638_DR && relayBit != TpicBit::K5_CAN12098_DR) return false;
  const uint32_t cur = TpicControl::state();
  if ((cur & CAN_MASK) != 0) return false;
  return requestedOutputWord(cur | bitMask(relayBit));
}
void faultSafe() { TpicControl::allOff(); }
bool applyCableTestOutput(uint32_t cableOutputBits) {
  if (cableOutputBits & ~CABLE_OUTPUT_MASK) return false;
  if (!oneOrZeroBits(cableOutputBits)) return false;
  return requestedOutputWord(cableOutputBits);
}
bool applyMeasurementReference(uint32_t bits) {
  if (bits != 0 && bits != K6_BIT) return false;
  return requestedOutputWord(bits);
}
bool applyLoadOutput(uint32_t loadOutputBits) {
  if (loadOutputBits == 0) return false;
  if (loadOutputBits & ~LOAD_OUTPUT_MASK) return false;
  if (!oneOrZeroBits(loadOutputBits)) return false;
  return requestedOutputWord(loadOutputBits | K1_BIT);
}
} // namespace SafetyInterlocks
