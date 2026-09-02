#include <Arduino.h>
#include "pins.h"

namespace {
uint32_t outputWord = 0;

void shiftWord(uint32_t word) {
  digitalWrite(Pins::TPIC_RCK, LOW);

  // Physical chain is U6 -> U5 -> U4 -> U3.
  // Send farthest register (U3) first, then U4, U5, U6.
  for (int byteIndex = 3; byteIndex >= 0; --byteIndex) {
    shiftOut(Pins::TPIC_SER, Pins::TPIC_CLK, MSBFIRST,
             static_cast<uint8_t>((word >> (byteIndex * 8)) & 0xFF));
  }

  digitalWrite(Pins::TPIC_RCK, HIGH);
  digitalWrite(Pins::TPIC_RCK, LOW);
}
}

namespace TpicControl {

void write(uint32_t word) {
  outputWord = word;
  shiftWord(outputWord);
}

uint32_t state() {
  return outputWord;
}

void setBit(int bit, bool on) {
  if (bit < 0 || bit > 31) return;
  uint32_t next = outputWord;
  if (on) next |= (1UL << bit);
  else next &= ~(1UL << bit);
  write(next);
}

void allOff() {
  write(0);
}

void begin() {
  pinMode(Pins::TPIC_SER, OUTPUT);
  pinMode(Pins::TPIC_CLK, OUTPUT);
  pinMode(Pins::TPIC_RCK, OUTPUT);
  pinMode(Pins::TPIC_OE, OUTPUT);

  digitalWrite(Pins::TPIC_OE, HIGH); // disable outputs first
  digitalWrite(Pins::TPIC_SER, LOW);
  digitalWrite(Pins::TPIC_CLK, LOW);
  digitalWrite(Pins::TPIC_RCK, LOW);

  allOff();
  digitalWrite(Pins::TPIC_OE, LOW); // enable only after zero word is latched
}

}
