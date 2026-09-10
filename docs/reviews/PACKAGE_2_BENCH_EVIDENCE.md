# BREMSECU G1 REV-2 — Package 2 Bench Evidence

Status: BENCH PENDING
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`
Procedure: `docs/reviews/PACKAGE_2_BENCH_PROCEDURE.md`

## Hard rules

- No conversion coefficient, shunt value, relay-state assumption, threshold margin, or CAN `_R` model may be inferred.
- Record only directly observed bench evidence.
- Existing repository evidence may be cited as supporting evidence, but it does not satisfy a Package 2 physical-verification item unless it directly records the required observation.
- Do not change firmware behavior in Package 2.
- Any unresolved item remains explicitly `PENDING`.

---

## Existing-evidence pre-audit

The repository was reviewed before requesting new bench work so that already captured evidence is not repeated unnecessarily.

### Supporting evidence already present

- `docs/engineering/bringup-results.md` records successful K1..K6 relay actuation after the prototype TQ relay orientation correction.
- `docs/engineering/relay-logic.md` and `docs/engineering/safety-interlocks.md` define the current authority intent: K1 OFF = 3.3V, K1 ON = 24V; normal scans use K6; GND validation uses K6 ON -> K6 OFF -> restore K6.
- `docs/engineering/calibration.md` records a valid calibration-source dataset captured with MASTER_GND included at 0V, 3V, 12V, 18V, 24V and 30V. It explicitly leaves final coefficients and GND two-reference thresholds pending.
- `docs/engineering/bringup-results.md` records INA226 I2C and bus-voltage operation as PASS, while current/shunt calibration remains open.
- `firmware/src/services/ina226_service.cpp` intentionally blocks current access until a non-zero shunt/current calibration is explicitly applied; it does not contain an authoritative shunt value.
- `docs/engineering/adc-mux-map.md` and `firmware/include/channels.h` preserve the `_R` channel identities separately from direct connector CAN channels.
- `firmware/src/services/pulse_monitor.cpp` preserves the verified GPIO36/GPIO39 pulse mapping and records edge/live-level evidence only; it contains no analog CD40106 threshold model.

### Pre-audit conclusion

No existing repository evidence is sufficient to mark any Package 2 subsection `BENCH PASS` without additional direct physical observations. The missing observations are listed below.

---

## 2.1 K1 default contact state

Condition verified on the physical prototype.

Direct bench observation supplied during Package 2:

- With K1 de-energized, `SELECT_V` is connected to the 3.3V contact/path.
- When K1 is energized, `SELECT_V` switches to the 24V path through the relay.
- No exact resistance value was recorded; evidence is continuity/functional-path observation only.

| K1 state | Observed SELECT_V path | Instrument / note |
| --- | --- | --- |
| De-energized | `SELECT_V <-> 3.3V` connected | physical continuity observation; exact ohms not recorded |
| Energized | `SELECT_V <-> 24V` connected | physical relay-switching observation; exact ohms not recorded |

Observed hardware behavior matches the current authority intent: K1 OFF = 3.3V, K1 ON = 24V.

Verdict: **BENCH PASS**

---

## 2.2 ISO7638 GND1 / GND2 transfer behavior

Determine the real transfer behavior for:

- `7P_GND1`
- `7P_GND2`

Do not assume the normal 100k/10k vehicle-voltage divider model.

Existing supporting evidence:

- A valid MASTER_GND-inclusive calibration-source dataset exists at 0V, 3V, 12V, 18V, 24V and 30V.
- Repository authority explicitly separates GND-sense channels from ordinary divided-voltage channels.
- Final GND two-reference thresholds remain pending in the existing calibration/status documents.

Missing Package 2 evidence:

- Numerical paired K6-ON / K6-OFF observations for `7P_GND1` and `7P_GND2` sufficient to describe their real transfer behavior.

### `7P_GND1`

| Applied pin condition / voltage | K6 state | Measured node voltage / ADC evidence | Note |
| --- | --- | --- | --- |
| 0V | ON/OFF | PENDING | |
| 3V | ON/OFF | PENDING | |
| 12V | ON/OFF | PENDING | |
| 18V | ON/OFF | PENDING | |
| 24V | ON/OFF | PENDING | |
| 30V | ON/OFF | PENDING | |

Observed transfer relation: PENDING

### `7P_GND2`

| Applied pin condition / voltage | K6 state | Measured node voltage / ADC evidence | Note |
| --- | --- | --- | --- |
| 0V | ON/OFF | PENDING | |
| 3V | ON/OFF | PENDING | |
| 12V | ON/OFF | PENDING | |
| 18V | ON/OFF | PENDING | |
| 24V | ON/OFF | PENDING | |
| 30V | ON/OFF | PENDING | |

Observed transfer relation: PENDING

Verdict: PENDING

---

## 2.3 INA226 shunt

Read or measure the actual shunt used by the installed INA226 module.

Existing supporting evidence:

- INA226 device/I2C and bus-voltage operation passed bring-up.
- Firmware intentionally keeps current measurement calibration-gated.
- No authoritative physical shunt value was found in the repository pre-audit.

Missing Package 2 evidence:

- Direct component-marking and/or reliable low-resistance measurement of the installed shunt.

| Item | Observed value | Evidence / marking / method |
| --- | --- | --- |
| Shunt resistor marking | PENDING | |
| Shunt resistance | PENDING | |

No current conversion constant is authorized until this value is bench-verified.

Verdict: PENDING

---

## 2.4 MASTER_GND / K6 return path

Existing supporting evidence:

- Normal voltage scans are specified with K6 energized.
- Ground-channel validation is specified as K6 ON -> K6 OFF -> restore K6.
- Existing valid calibration-source capture includes MASTER_GND.

Missing Package 2 evidence:

- Direct comparison proving whether cable test depends on K6.
- Direct K6-ON/K6-OFF comparison for each measurement/calibration family.
- Direct observation of what becomes electrically undefined, floating, shifted or otherwise changed with K6 open.

| Question | Observed answer | Evidence / note |
| --- | --- | --- |
| Is K6 required during cable test? | PENDING | direct physical comparison required |
| Normal divided-voltage family: K6 dependency | PENDING | |
| GND-sense family: K6 dependency | PENDING | |
| Direct connector CAN family: K6 dependency | PENDING | |
| CAN `_R` family: K6 dependency | PENDING | |
| What happens electrically when K6 is open? | PENDING | |

Verdict: PENDING

---

## 2.5 CD40106 threshold margin

Existing supporting evidence:

- GPIO36 (`SAG_PULS`) and GPIO39 (`SOL_PULS`) mapping is frozen and enforced in firmware.
- Pulse firmware captures edges and live digital level only; it does not define an analog switching threshold.
- No existing 22V/24V/28V CD40106 input-node characterization was found in the repository pre-audit.

Missing Package 2 evidence:

- Direct Schmitt-input node voltage and digital-output behavior at 22V, 24V and 28V for the verified pulse path(s).

| Pulse path | Source voltage | Schmitt input node voltage | Digital output behavior | Scope / note |
| --- | ---: | ---: | --- | --- |
| SAG / GPIO36 path | 22 V | PENDING | PENDING | |
| SAG / GPIO36 path | 24 V | PENDING | PENDING | |
| SAG / GPIO36 path | 28 V | PENDING | PENDING | |
| SOL / GPIO39 path | 22 V | PENDING | PENDING | |
| SOL / GPIO39 path | 24 V | PENDING | PENDING | |
| SOL / GPIO39 path | 28 V | PENDING | PENDING | |

Verdict: PENDING

---

## 2.6 CAN `_R` state dependency

Existing supporting evidence:

- Direct connector CAN and `_R` channels are separate measurement families.
- `_R` channel identities and MUX coordinates are frozen.
- CAN termination measurement requires the external circuit to be de-energized.
- One-CAN-relay-at-a-time interlock remains authoritative.
- No existing bench evidence was found that determines whether `_R` conversion depends on relay/path state or whether a delta method cancels that dependency.

Missing Package 2 evidence:

- Same external CAN condition observed with all CAN relays OFF and with the appropriate single relay/path selected.
- Evidence isolating the measurement change caused solely by relay/path state.

| Relay / termination state | Applied CAN condition | CANH `_R` evidence | CANL `_R` evidence | Note |
| --- | --- | --- | --- | --- |
| all CAN relays OFF | PENDING | PENDING | PENDING | baseline |
| K2 / ISO7638 CK | PENDING | PENDING | PENDING | |
| K3 / ISO12098 CK | PENDING | PENDING | PENDING | |
| K4 / ISO7638 DR | PENDING | PENDING | PENDING | |
| K5 / ISO12098 DR | PENDING | PENDING | PENDING | |

Observed relay-state dependency: PENDING

Authorized conversion approach: PENDING

Verdict: PENDING

---

## Package 2 gate

Package 2 may be marked `BENCH PASS` only when all six sections above contain direct evidence and no required engineering value remains inferred.

Current status: **BENCH PENDING**
