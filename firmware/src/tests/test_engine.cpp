#include <Arduino.h>

namespace SafetyInterlocks {
void faultSafe();
}

enum class TestMode {
  Idle,
  Iso7638Voltage,
  Iso12098Voltage,
  Iso7638Cable,
  Iso12098Cable,
  Iso7638TerminationTractor,
  Iso7638TerminationTrailer,
  Iso12098TerminationTractor,
  Iso12098TerminationTrailer,
  Iso12098Lamp,
  AxleLift
};

namespace TestEngine {
namespace {
TestMode current = TestMode::Idle;
}

bool start(TestMode mode) {
  if (mode == TestMode::Idle) return false;
  if (current != TestMode::Idle) return false;
  current = mode;
  return true;
}

void cancel() {
  SafetyInterlocks::faultSafe();
  current = TestMode::Idle;
}

TestMode mode() {
  return current;
}

bool active() {
  return current != TestMode::Idle;
}
}
