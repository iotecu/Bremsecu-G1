# BREMSECU G1 REV-2 — Cable Test Engine

Status: REQUIRED REV-2 diagnostic behavior.

Cross Scan is a core REV-2 capability integrated into Cable Test. It is not a separate top-level screen, carousel module, or standalone test mode.

## 1. Purpose

The cable engine performs, for each user-enabled pin:

1. expected continuity measurement on the selected focus pin,
2. simultaneous cross-response scanning of the other relevant channels,
3. detection and recording of possible short-circuit / cross-coupling / miswire relationships.

The engine uses the approved 3.3V cable-test source only. K1 must remain OFF for the entire cable-test workflow.

## 2. Test sequence

1. **Baseline scan**
   - All controllable cable-test outputs OFF.
   - Read every ADC channel returned by `scanChannelsFor(socket)`.
   - Store as `baseline[ch]`.
2. **Enabled-pin selection**
   - The PWA row toggles determine which pins participate.
   - Disabled pins are skipped as focus pins.
3. **Focus pin ON**
   - Energize exactly one selected pin with the approved 3.3V source.
   - K1 remains OFF.
4. **ON settle**
   - Wait `settleTimeMs`.
   - This is PENDING bench characterization and must remain configurable.
5. **Continuity measurement**
   - Read the expected focus ADC channel.
   - Call `classifyContinuity(focusChannel, baseline[focusChannel], focusVoltage)`.
6. **Cross-response scan**
   - While the focus pin remains ON, scan the other channels from `scanChannelsFor(socket)`.
   - Skip the focus channel itself.
   - Compute `delta = current - baseline[ch]`.
   - Call `classifyCrossResponse(ch, baseline[ch], current)`.
   - Unexpected significant response is stored as a short/miswire candidate `focusPin <-> scannedPin/channel`.
7. **Focus pin OFF**
   - Release the selected output before any other focus pin is activated.
8. **OFF settle**
   - Wait `offSettleTimeMs` before the next focus pin.
   - This is PENDING bench characterization and must remain configurable.
9. **Next enabled pin**
   - Repeat until every enabled pin has been processed.
10. **Complete**
   - Report continuity result per selected pin plus all detected cross-response relationships.

## 3. Hard interlocks

- **Single active test pin:** never energize two cable-test outputs at the same time.
- **3.3V only:** K1 must remain OFF for cable-test mode.
- **No arbitrary TPIC writes from PWA:** PWA requests test intent only; firmware owns physical state.
- **Focus OFF before next focus ON:** every step must return the previous test output OFF before proceeding.
- **Socket-specific measurement list:** the active test uses the approved channel set for the selected socket/test context.

## 4. Configurable parameters — PENDING bench characterization

```cpp
struct CableTestConfig {
  float continuityMinV;        // provisional concept ~2.0V, NOT production-frozen
  float continuityMaxV;        // provisional concept ~5.0V, NOT production-frozen
  float crossResponseDeltaV;   // provisional concept ~1.5V, NOT production-frozen
  uint32_t settleTimeMs;       // provisional concept ~50ms, NOT production-frozen
  uint32_t offSettleTimeMs;    // provisional concept ~20ms, NOT production-frozen
};
```

These example values express the intended scale only. Coding agents must not treat them as final production constants until bench characterization freezes them.

## 5. Classification interfaces

```cpp
enum class ContinuityResult {
  PASS,
  OPEN,
  INDETERMINATE
};

struct CrossResponseResult {
  bool isCoupled;
  float delta;
};

ContinuityResult classifyContinuity(
  ChannelId ch,
  float baseline,
  float measured
);

CrossResponseResult classifyCrossResponse(
  ChannelId ch,
  float baseline,
  float measured
);
```

The classification functions consume configuration/characterization data. Do not bury production thresholds as magic literals inside the test loop.

## 6. Socket/channel mapping rule

```cpp
std::vector<ChannelId> scanChannelsFor(SocketType socket);
```

Important implementation distinction:

- TPIC output identity tells firmware **which source pin to energize**.
- ADC/MUX channel identity tells firmware **which measurement channel to read**.
- These are not interchangeable namespaces.
- `pinToChannel()` and `channelToPin()` must use the frozen hardware maps from:
  - `tpic-output-map.md`
  - `adc-mux-map.md`

Do not construct the ADC scan list from TPIC bit numbers.

## 7. Engine pseudocode

```cpp
class CableTestEngine {
public:
  void start(SocketType socket, uint32_t enabledPinMask) {
    socket_ = socket;
    enabledPinMask_ = enabledPinMask;
    currentIndex_ = 0;
    complete_ = false;
    shorts_.clear();
    results_.clear();

    Safety::requireCableTest3V3();
    TpicControl::allTestOutputsOff();
    wait(config_.settleTimeMs);

    for (ChannelId ch : scanChannelsFor(socket_)) {
      baseline_[ch] = AdcService::readVoltage(ch);
    }
  }

  void step() {
    PinId focusPin = nextEnabledPin();
    if (!focusPin.valid()) {
      complete();
      return;
    }

    ChannelId focusChannel = pinToChannel(focusPin, socket_);

    Safety::requireCableTest3V3();
    Safety::requireNoOtherCablePinActive();
    TpicControl::setCablePin(focusPin, true);
    wait(config_.settleTimeMs);

    float focusVoltage = AdcService::readVoltage(focusChannel);
    auto continuity = classifyContinuity(
      focusChannel,
      baseline_[focusChannel],
      focusVoltage
    );
    results_[focusPin] = {continuity, focusVoltage};

    for (ChannelId ch : scanChannelsFor(socket_)) {
      if (ch == focusChannel) continue;

      float measured = AdcService::readVoltage(ch);
      auto cross = classifyCrossResponse(ch, baseline_[ch], measured);

      if (cross.isCoupled) {
        shorts_.push_back({focusPin, channelToPin(ch, socket_), cross.delta});
      }
    }

    TpicControl::setCablePin(focusPin, false);
    wait(config_.offSettleTimeMs);
    advance();
  }
};
```

## 8. Result model

Per selected pin retain at least:
- focus pin identity,
- function name,
- baseline value,
- focus measured value,
- continuity classification,
- classification-final flag,
- cross-response candidates,
- raw delta evidence,
- timestamp/test-step identity.

Where thresholds remain PENDING, preserve measurements and mark final classification accordingly instead of inventing production PASS/FAIL limits.
