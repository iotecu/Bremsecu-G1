#pragma once

#include <cstdint>
#include "channels.h"

namespace GroundAssist {

// External relay board uses active-high IN1..IN4.
// begin() establishes all channels OFF before any test can request assistance.
void begin();
void allOff();

// Enable/disable the relay that connects the requested socket GND pin to
// MASTER_GND. Only the four confirmed GND pins are accepted.
bool set(Channels::Socket socket, uint8_t pin, bool enabled);
bool isOn(Channels::Socket socket, uint8_t pin);

} // namespace GroundAssist
