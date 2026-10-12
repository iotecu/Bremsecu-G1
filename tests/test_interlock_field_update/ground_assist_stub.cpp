#include "ground_assist.h"

namespace GroundAssist {

void begin() {}
void allOff() {}

bool set(Channels::Socket, uint8_t, bool) {
  return true;
}

bool isOn(Channels::Socket, uint8_t) {
  return false;
}

} // namespace GroundAssist
