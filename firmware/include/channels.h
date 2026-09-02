#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — channels.h
// Channel / output / relay IDENTITY and frozen mapping only.
//
// AUTHORITY (this header must be re-derived only from):
//   - docs/engineering/adc-mux-map.md     (channel identity, MUX coordinates,
//                                          combined scan matrix, NC exclusion)
//   - docs/engineering/tpic-output-map.md (logical outputs OUT1..OUT22,
//                                          U6 relay/control drains)
//   Socket pin numbering follows the ISO 7638 / ISO 12098 standard assignments
//   as encoded by the 7P_* / 15P_* net names in the authority documents.
//
// DELIBERATELY NOT HERE (belong to other modules / are PENDING):
//   - no electrical thresholds, no calibration coefficients
//   - no MUX settle / sampling / timing constants
//   - no classification logic (PASS/FAIL/etc.)
//   - no measurement-family conversion rules (measurement-methods.md)
//   - no pulse GPIO edge logic (pulse_monitor module)
// =============================================================================

#include <cstdint>
#include "pins.h"
#include "tpic_map.h"

namespace Channels {

enum class AdcChannel : uint8_t {
  MUX_7P_GND1 = 0,
  MUX_7P_AKU,
  MUX_7P_KONTAK,
  MUX_7P_GND2,
  MUX_7P_ABS,
  MUX_7P_CAN_H,
  MUX_7P_CAN_L,
  MUX_15P_SOL_PARK,
  MUX_15P_SIS,
  MUX_15P_SAG_SINYAL,
  MUX_15P_SAG_PARK,
  MUX_15P_SOL_SINYAL,
  MUX_15P_AKU,
  MUX_15P_GERI,
  MUX_15P_STOP,
  MUX_15P_BALATA_SINYAL,
  MUX_15P_ASANSOR,
  MUX_15P_YAYLI,
  MUX_15P_CAN_L,
  MUX_CANL_2_R,
  MUX_15P_GND3,
  MUX_15P_GND4,
  MUX_CANH_1_R,
  MUX_CANL_1_R,
  MUX_CANH_2_R,
  MUX_15P_CAN_H
};

constexpr uint8_t kAdcChannelCount = 26;
constexpr AdcChannel kNoChannel = static_cast<AdcChannel>(0xFF);

struct MuxCoord { uint8_t ain; uint8_t step; };
constexpr MuxCoord kInvalidMuxCoord = {0xFF, 0xFF};
constexpr bool isValidDiagnosticChannel(AdcChannel ch) { return static_cast<uint8_t>(ch) < kAdcChannelCount; }
constexpr bool isValidMuxCoord(MuxCoord c) { return c.ain <= 3 && c.step <= 7; }

constexpr MuxCoord kMuxTable[kAdcChannelCount] = {
  {0,0},{0,1},{0,2},{0,3},{0,4},{0,6},{0,7},
  {1,0},{1,1},{1,2},{1,3},{1,4},{1,5},{1,6},{1,7},
  {2,0},{2,1},{2,2},{2,4},{2,5},{2,6},{2,7},
  {3,0},{3,1},{3,2},{3,3}
};

constexpr MuxCoord muxCoordinatesFor(AdcChannel ch) {
  return isValidDiagnosticChannel(ch) ? kMuxTable[static_cast<uint8_t>(ch)] : kInvalidMuxCoord;
}

enum class Socket : uint8_t { ISO7638 = 0, ISO12098 = 1 };
constexpr uint8_t kSocketPinCount7638 = 7;
constexpr uint8_t kSocketPinCount12098 = 15;
constexpr bool isValidSocket(Socket s) { return s == Socket::ISO7638 || s == Socket::ISO12098; }

struct SocketPin { Socket socket; uint8_t pin; bool valid; };

constexpr AdcChannel k7638PinToChannel[kSocketPinCount7638] = {
  AdcChannel::MUX_7P_AKU, AdcChannel::MUX_7P_KONTAK, AdcChannel::MUX_7P_GND1,
  AdcChannel::MUX_7P_GND2, AdcChannel::MUX_7P_ABS, AdcChannel::MUX_7P_CAN_H,
  AdcChannel::MUX_7P_CAN_L
};

constexpr AdcChannel k12098PinToChannel[kSocketPinCount12098] = {
  AdcChannel::MUX_15P_SOL_SINYAL, AdcChannel::MUX_15P_SAG_SINYAL, AdcChannel::MUX_15P_SIS,
  AdcChannel::MUX_15P_GND3, AdcChannel::MUX_15P_SOL_PARK, AdcChannel::MUX_15P_SAG_PARK,
  AdcChannel::MUX_15P_STOP, AdcChannel::MUX_15P_GERI, AdcChannel::MUX_15P_AKU,
  AdcChannel::MUX_15P_BALATA_SINYAL, AdcChannel::MUX_15P_YAYLI, AdcChannel::MUX_15P_ASANSOR,
  AdcChannel::MUX_15P_GND4, AdcChannel::MUX_15P_CAN_H, AdcChannel::MUX_15P_CAN_L
};

constexpr SocketPin kChannelToPin[kAdcChannelCount] = {
  {Socket::ISO7638,3,true},{Socket::ISO7638,1,true},{Socket::ISO7638,2,true},{Socket::ISO7638,4,true},
  {Socket::ISO7638,5,true},{Socket::ISO7638,6,true},{Socket::ISO7638,7,true},
  {Socket::ISO12098,5,true},{Socket::ISO12098,3,true},{Socket::ISO12098,2,true},{Socket::ISO12098,6,true},
  {Socket::ISO12098,1,true},{Socket::ISO12098,9,true},{Socket::ISO12098,8,true},{Socket::ISO12098,7,true},
  {Socket::ISO12098,10,true},{Socket::ISO12098,12,true},{Socket::ISO12098,11,true},{Socket::ISO12098,15,true},
  {Socket::ISO12098,0,false},{Socket::ISO12098,4,true},{Socket::ISO12098,13,true},
  {Socket::ISO12098,0,false},{Socket::ISO12098,0,false},{Socket::ISO12098,0,false},{Socket::ISO12098,14,true}
};

constexpr AdcChannel pinToChannel(Socket s, uint8_t pin) {
  return (s == Socket::ISO7638)
    ? ((pin >= 1 && pin <= kSocketPinCount7638) ? k7638PinToChannel[pin - 1] : kNoChannel)
    : ((s == Socket::ISO12098)
        ? ((pin >= 1 && pin <= kSocketPinCount12098) ? k12098PinToChannel[pin - 1] : kNoChannel)
        : kNoChannel);
}

constexpr SocketPin channelToPin(AdcChannel ch) {
  return isValidDiagnosticChannel(ch) ? kChannelToPin[static_cast<uint8_t>(ch)] : SocketPin{Socket::ISO7638,0,false};
}

enum class TpicOutput : uint8_t {
  OUT1_AKU_24V_1 = 0, OUT2_KONTAK_24V, OUT3_GND1, OUT4_GND2,
  OUT5_ABS, OUT6_CANH_1_DR, OUT7_CANL_1_DR, OUT8_SOL_SINYAL,
  OUT9_SAG_SINYAL, OUT10_ARKA_SIS, OUT11_GND3, OUT12_SOL_PARK,
  OUT13_SAG_PARK, OUT14_STOP_LAMBASI, OUT15_GERI_VITES, OUT16_AKU_24V_2,
  OUT17_BALATA_SINYAL, OUT18_YAYLI_FREN, OUT19_ASANSOR_DINGIL, OUT20_GND4,
  OUT21_CANH_2_DR, OUT22_CANL_2_DR
};

constexpr uint8_t kTpicOutputCount = 22;
constexpr TpicOutput kNoTpicOutput = static_cast<TpicOutput>(0xFF);
constexpr bool isValidTpicOutput(TpicOutput out) { return static_cast<uint8_t>(out) < kTpicOutputCount; }

enum class RelayControl : uint8_t {
  RELAY_CAN7638_DR = 0, RELAY_CAN12098_DR, RELAY_CAN12098_CK,
  RELAY_CAN7638_CK, RELAY_SELECT_V, RELAY_MASTER_GND
};
constexpr uint8_t kRelayControlCount = 6;

constexpr uint8_t kOutputToTpicBit[kTpicOutputCount] = {
  TpicBit::OUT1_AKU1,TpicBit::OUT2_KONTAK,TpicBit::OUT3_GND1,TpicBit::OUT4_GND2,
  TpicBit::OUT5_ABS,TpicBit::OUT6_CANH1_DR,TpicBit::OUT7_CANL1_DR,TpicBit::OUT8_SOL_SINYAL,
  TpicBit::OUT9_SAG_SINYAL,TpicBit::OUT10_ARKA_SIS,TpicBit::OUT11_GND3,TpicBit::OUT12_SOL_PARK,
  TpicBit::OUT13_SAG_PARK,TpicBit::OUT14_STOP,TpicBit::OUT15_GERI,TpicBit::OUT16_AKU2,
  TpicBit::OUT17_BALATA,TpicBit::OUT18_YAYLI,TpicBit::OUT19_ASANSOR,TpicBit::OUT20_GND4,
  TpicBit::OUT21_CANH2_DR,TpicBit::OUT22_CANL2_DR
};

constexpr uint8_t kRelayToTpicBit[kRelayControlCount] = {
  TpicBit::K4_CAN7638_DR,TpicBit::K5_CAN12098_DR,TpicBit::K3_CAN12098_CK,
  TpicBit::K2_CAN7638_CK,TpicBit::K1_SELECT_V,TpicBit::K6_MASTER_GND
};
constexpr uint8_t kNoTpicBit = 0xFF;

constexpr TpicOutput k7638PinToOutput[kSocketPinCount7638] = {
  TpicOutput::OUT1_AKU_24V_1,TpicOutput::OUT2_KONTAK_24V,TpicOutput::OUT3_GND1,
  TpicOutput::OUT4_GND2,TpicOutput::OUT5_ABS,TpicOutput::OUT6_CANH_1_DR,TpicOutput::OUT7_CANL_1_DR
};

constexpr TpicOutput k12098PinToOutput[kSocketPinCount12098] = {
  TpicOutput::OUT8_SOL_SINYAL,TpicOutput::OUT9_SAG_SINYAL,TpicOutput::OUT10_ARKA_SIS,
  TpicOutput::OUT11_GND3,TpicOutput::OUT12_SOL_PARK,TpicOutput::OUT13_SAG_PARK,
  TpicOutput::OUT14_STOP_LAMBASI,TpicOutput::OUT15_GERI_VITES,TpicOutput::OUT16_AKU_24V_2,
  TpicOutput::OUT17_BALATA_SINYAL,TpicOutput::OUT18_YAYLI_FREN,TpicOutput::OUT19_ASANSOR_DINGIL,
  TpicOutput::OUT20_GND4,TpicOutput::OUT21_CANH_2_DR,TpicOutput::OUT22_CANL_2_DR
};

constexpr TpicOutput tpicOutputFor(Socket s, uint8_t pin) {
  return (s == Socket::ISO7638)
    ? ((pin >= 1 && pin <= kSocketPinCount7638) ? k7638PinToOutput[pin - 1] : kNoTpicOutput)
    : ((s == Socket::ISO12098)
        ? ((pin >= 1 && pin <= kSocketPinCount12098) ? k12098PinToOutput[pin - 1] : kNoTpicOutput)
        : kNoTpicOutput);
}

constexpr uint8_t tpicBitFor(TpicOutput out) {
  return isValidTpicOutput(out) ? kOutputToTpicBit[static_cast<uint8_t>(out)] : kNoTpicBit;
}
constexpr uint8_t tpicBitFor(RelayControl r) {
  return (static_cast<uint8_t>(r) < kRelayControlCount) ? kRelayToTpicBit[static_cast<uint8_t>(r)] : kNoTpicBit;
}

struct ChannelList { AdcChannel ch[kAdcChannelCount]; uint8_t count; };

constexpr ChannelList kScanChannels7638 = {
  { AdcChannel::MUX_7P_AKU, AdcChannel::MUX_7P_KONTAK, AdcChannel::MUX_7P_GND1,
    AdcChannel::MUX_7P_GND2, AdcChannel::MUX_7P_ABS, AdcChannel::MUX_7P_CAN_H,
    AdcChannel::MUX_7P_CAN_L }, 7
};

constexpr ChannelList kScanChannels12098 = {
  { AdcChannel::MUX_15P_SOL_SINYAL, AdcChannel::MUX_15P_SAG_SINYAL, AdcChannel::MUX_15P_SIS,
    AdcChannel::MUX_15P_GND3, AdcChannel::MUX_15P_SOL_PARK, AdcChannel::MUX_15P_SAG_PARK,
    AdcChannel::MUX_15P_STOP, AdcChannel::MUX_15P_GERI, AdcChannel::MUX_15P_AKU,
    AdcChannel::MUX_15P_BALATA_SINYAL, AdcChannel::MUX_15P_YAYLI, AdcChannel::MUX_15P_ASANSOR,
    AdcChannel::MUX_15P_GND4, AdcChannel::MUX_15P_CAN_H, AdcChannel::MUX_15P_CAN_L }, 15
};

constexpr ChannelList scanChannelsFor(Socket s) {
  return (s == Socket::ISO7638) ? kScanChannels7638
       : (s == Socket::ISO12098) ? kScanChannels12098
       : ChannelList{{kNoChannel},0};
}

static_assert(static_cast<uint8_t>(AdcChannel::MUX_15P_CAN_H) == kAdcChannelCount - 1, "AdcChannel ordering drift");
static_assert(static_cast<uint8_t>(AdcChannel::MUX_7P_CAN_H) == 5 && kMuxTable[5].step == 6, "enum ordinals are table indices, NOT physical MUX steps");
static_assert(muxCoordinatesFor(AdcChannel::MUX_15P_CAN_H).ain == 3 && muxCoordinatesFor(AdcChannel::MUX_15P_CAN_H).step == 3, "15P_CAN_H must be AIN3/step3");
static_assert(muxCoordinatesFor(AdcChannel::MUX_7P_GND1).ain == 0 && muxCoordinatesFor(AdcChannel::MUX_7P_GND1).step == 0, "7P_GND1 must be AIN0/step0");
static_assert(muxCoordinatesFor(kNoChannel).ain == 0xFF && muxCoordinatesFor(kNoChannel).step == 0xFF, "invalid channel must yield kInvalidMuxCoord");
static_assert(!isValidMuxCoord(kInvalidMuxCoord), "kInvalidMuxCoord must fail validity");
static_assert(isValidSocket(Socket::ISO7638) && isValidSocket(Socket::ISO12098), "known sockets must be valid");
static_assert(!isValidSocket(static_cast<Socket>(0xFE)), "invalid socket must fail validity");
static_assert(pinToChannel(static_cast<Socket>(0xFE),1) == kNoChannel, "invalid socket must yield kNoChannel");
static_assert(tpicOutputFor(static_cast<Socket>(0xFE),1) == kNoTpicOutput, "invalid socket must yield kNoTpicOutput");
static_assert(pinToChannel(Socket::ISO7638,1) == AdcChannel::MUX_7P_AKU, "7638 pin1");
static_assert(pinToChannel(Socket::ISO12098,13) == AdcChannel::MUX_15P_GND4, "12098 pin13");
static_assert(channelToPin(AdcChannel::MUX_CANH_1_R).valid == false, "_R nodes are not socket pins");
static_assert(tpicBitFor(TpicOutput::OUT8_SOL_SINYAL) == 31, "OUT8 = bit31");
static_assert(tpicBitFor(TpicOutput::OUT1_AKU_24V_1) == 24, "OUT1 = bit24");
static_assert(tpicBitFor(RelayControl::RELAY_SELECT_V) == 6, "K1 = bit6");
static_assert(tpicBitFor(kNoTpicOutput) == kNoTpicBit, "invalid output must yield kNoTpicBit");
static_assert(tpicBitFor(static_cast<RelayControl>(0xFE)) == kNoTpicBit, "invalid relay must yield kNoTpicBit");
static_assert(tpicOutputFor(Socket::ISO7638,8) == kNoTpicOutput, "out-of-range pin must yield kNoTpicOutput");
static_assert(scanChannelsFor(Socket::ISO7638).count == 7, "7638 scan list size");
static_assert(scanChannelsFor(Socket::ISO12098).count == 15, "12098 scan list size");
static_assert(scanChannelsFor(Socket::ISO7638).ch[0] == AdcChannel::MUX_7P_AKU, "7638 scan list order follows connector pins");
static_assert(scanChannelsFor(Socket::ISO12098).ch[14] == AdcChannel::MUX_15P_CAN_L, "12098 scan list order follows connector pins");
static_assert(scanChannelsFor(static_cast<Socket>(0xFE)).count == 0, "invalid socket must yield empty scan list");

} // namespace Channels
