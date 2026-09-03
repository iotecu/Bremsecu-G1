# BREMSECU G1 REV-2 — Test Specifications

Status: ENGINEERING TEST AUTHORITY.

## 1. Voltage tests

Voltage-test sequencing, channel identity, calibration families, K6 ground-validation behavior and pulse handling follow:
- `measurement-methods.md`
- `adc-mux-map.md`
- `calibration.md`
- `safety-interlocks.md`

Pending calibration coefficients or diagnosis thresholds must not be invented.

### ISO 7638 live-voltage diagnostic rule

ISO 7638 voltage testing is a live observation test, not a controlled activation or cross-scan test.

- AKU, KONTAK and ABS supply-class lines may legitimately be energized at the same time.
- Voltage present on another supply-class pin is not, by itself, short-circuit or miswire evidence.
- Each pin is classified according to its own electrical role/family.
- GND1/GND2 are ground-class channels; significant positive supply voltage on a ground line is abnormal evidence, with final thresholds still PENDING.
- CAN H/CAN L are CAN-class channels; supply-level voltage such as 24V on a CAN line is abnormal/fault evidence, while normal CAN DC levels must use CAN-specific classification rules.
- Cross-channel short/miswire inference belongs to controlled Cable Test / Cross Scan, not to the normal ISO 7638 live-voltage scan.

Examples:
- AKU = 24V while KONTAK = 24V: not short evidence by itself.
- 24V-class voltage on GND1/GND2: abnormal evidence.
- 24V-class voltage on CAN H/CAN L: abnormal evidence.

Final PASS/WARN/FAIL windows remain PENDING bench characterization and calibration.

## 2. CAN termination tests

- External system must be de-energized before measurement.
- Exactly one of K2/K3/K4/K5 may be active at a time.
- Target connector/vehicle side selects the relay.
- Final PASS/WARN/FAIL resistance windows remain PENDING bench characterization.

## 3. CABLE TEST ENGINE — Cross Scan Integrated

Cross Scan is a required REV-2 capability embedded inside Cable Test. It is not a standalone screen or separate top-level test mode.

### Algorithm
1. **Baseline scan:** all controllable cable-test outputs OFF; read every ADC channel returned by `scanChannelsFor(socket)` and save `baseline[ch]`.
2. Process **enabled/toggled pins** sequentially.
3. Drive the **focus pin** with 3.3V only. K1 remains OFF.
4. After configurable ON-settle time, read the focus ADC channel and call `classifyContinuity()`.
5. While the same focus pin remains ON, scan all other relevant channels from `scanChannelsFor(socket)`.
6. Compare each scanned value with its own baseline and call `classifyCrossResponse()`.
7. If an unexpected significant response is detected, store a `focusPin <-> scannedPin/channel` short/miswire candidate with raw delta evidence.
8. Turn the focus pin OFF.
9. After configurable OFF-settle time, continue to the next enabled pin.
10. Firmware interlock guarantees that two cable-test pins are never ON simultaneously.

### Configurable parameters — PENDING bench characterization

```cpp
struct CableTestConfig {
  float continuityMinV;        // provisional concept ~2.0V, NOT frozen
  float continuityMaxV;        // provisional concept ~5.0V, NOT frozen
  float crossResponseDeltaV;   // provisional concept ~1.5V, NOT frozen
  uint32_t settleTimeMs;       // provisional concept ~50ms, NOT frozen
  uint32_t offSettleTimeMs;    // provisional concept ~20ms, NOT frozen
};
```

The approximate values above are design references only. They must not be promoted to production constants until bench characterization is completed.

### Classification interfaces

```cpp
ContinuityResult classifyContinuity(
  ChannelId ch,
  float baseline,
  float measured
);
// {PASS, OPEN, INDETERMINATE}

CrossResponseResult classifyCrossResponse(
  ChannelId ch,
  float baseline,
  float measured
);
// {isCoupled, delta}
```

### Socket-specific channel maps

```cpp
std::vector<ChannelId> scanChannelsFor(SocketType socket);
```

Rules:
- source/output identity comes from `tpic-output-map.md`,
- measurement identity comes from `adc-mux-map.md`,
- TPIC bit numbers must never be reused as ADC channel IDs,
- `pinToChannel()` / `channelToPin()` must explicitly map between these namespaces.

### Interlocks

- **Single active focus pin:** at most one cable-test source output active.
- **K1 OFF required:** cable test is 3.3V only; 24V cable test is prohibited.
- **Focus OFF before next focus ON.**
- **Firmware owns interlocks:** PWA cannot directly set TPIC bits or K1.

Full engine authority: `CABLE_TEST_ENGINE.md`.

## 4. Lamp / axle-lift tests

- K1 ON selects 24V only for approved load functions.
- One intended load output at a time unless a later frozen spec explicitly allows otherwise.
- INA226 provides current/bus evidence.
- Final current classification thresholds remain PENDING real-load characterization.
- Axle lift requires the approved safety-confirmation workflow.
