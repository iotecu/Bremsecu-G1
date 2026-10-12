#pragma once

namespace Pins {
constexpr int TPIC_SER = 23;
constexpr int TPIC_CLK = 18;
constexpr int TPIC_RCK = 5;
constexpr int TPIC_OE = 13;
constexpr int MUX_EN = 25;
constexpr int MUX_S0 = 16;
constexpr int MUX_S1 = 17;
constexpr int MUX_S2 = 27;
constexpr int I2C_SDA = 21;
constexpr int I2C_SCL = 22;
constexpr int SAG_PULS = 36;
constexpr int SOL_PULS = 39;
constexpr int SD_MISO = 34;
constexpr int SD_SCK = 32;
constexpr int SD_MOSI = 33;
constexpr int SD_CS = 4;

// External 4-channel GND-assist relay board (active-low inputs).
// Physical mapping confirmed on REV-2 prototype:
// K1 -> ISO7638 pin 3, K2 -> ISO7638 pin 4,
// K3 -> ISO12098 pin 4, K4 -> ISO12098 pin 13.
constexpr int GND_ASSIST_7638_PIN3 = 14;
constexpr int GND_ASSIST_7638_PIN4 = 26;
constexpr int GND_ASSIST_12098_PIN4 = 19;
constexpr int GND_ASSIST_12098_PIN13 = 15;
}
