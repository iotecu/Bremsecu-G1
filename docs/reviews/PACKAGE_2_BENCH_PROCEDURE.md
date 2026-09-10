# BREMSECU G1 REV-2 — Package 2 Bench Procedure

Status: PROCEDURE READY / RESULTS PENDING
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Evidence record: `docs/reviews/PACKAGE_2_BENCH_EVIDENCE.md`
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`

## Scope

This procedure exists only to collect genuinely missing Package 2 bench evidence. It does not authorize new firmware logic, thresholds, conversion constants, relay mappings, or calibration coefficients.

### Evidence reuse rule

Do **not** repeat bench measurements that have already been captured and accepted by repository authority.

`docs/engineering/calibration.md` explicitly records the MASTER_GND-referenced calibration dataset as captured and PASS, with source points 0V, 3V, 12V, 18V, 24V and 30V. That dataset is to be reused. Older pre-MASTER_GND captures remain invalid.

Package 2 therefore asks only for missing physical facts that are not already established by that dataset or by prior bring-up evidence.

Repository authority already fixes the following behavioral rules:

- K1 OFF selects the 3.3V cable-test source; K1 ON selects the 24V load source.
- Cable test is 3.3V only.
- K6 is the controlled MASTER_GND measurement reference.
- Ground validation uses a referenced state and a released-reference state.
- CAN direct connector channels and `_R` channels are different measurement families.
- At most one of K2/K3/K4/K5 may be energized at a time.
- CAN termination measurements require the external circuit to be de-energized.
- PENDING engineering values must not be guessed.

---

## 2.1 K1 default contact state

Objective: physically verify K1 source selection.

Accepted observation:

- K1 de-energized: `SELECT_V` is on the 3.3V path.
- K1 energized: `SELECT_V` switches to the 24V path.

No further K1 contact measurement is required unless later review finds contradictory hardware evidence.

---

## 2.2 ISO7638 GND1 / GND2 reference behavior

Objective: characterize the **ground/open reference behavior** of `7P_GND1` and `7P_GND2` without treating these channels as ordinary positive-voltage divider inputs.

Authoritative identity:

- `7P_GND1` = ISO7638 pin 3, ADC/MUX AIN0 step 000.
- `7P_GND2` = ISO7638 pin 4, ADC/MUX AIN0 step 011.

### Important correction

Do **not** inject the 0/3/12/18/24/30V calibration sweep into GND1/GND2 as a new Package 2 test. Those source points belong to the already captured calibration dataset and must not be recreated merely because Package 2 is being reviewed.

The missing GND question is the physical difference between:

1. MASTER_GND reference absent/open.
2. MASTER_GND connected to board GND.

Accepted Package 2 observation already obtained:

- With the board energized and no external energy applied to the connector pin inputs, the observed GND-sense node is approximately 3V when MASTER_GND is open.
- Manually connecting MASTER_GND to board GND drives the observed GND-sense node to approximately 0V.

This establishes the intended open/reference contrast. Do not derive final PASS/WARN/FAIL thresholds from these approximate values alone.

If later review requires per-channel confirmation that GND1 and GND2 are electrically identical in this behavior, only that narrow comparison should be made; do not repeat the full calibration dataset.

---

## 2.3 INA226 shunt

Objective: identify the actual shunt resistance used by the installed INA226 module.

Existing bring-up proves INA226 I2C and bus-voltage operation only; current/shunt calibration is still open.

Required missing evidence:

- shunt component marking and/or reliable low-resistance measurement,
- measurement method or explicit limitation.

No current conversion constant or lamp-current threshold is authorized until the real shunt value is established.

---

## 2.4 MASTER_GND / K6 return-path verification

Physical topology already verified:

- K6 is normally open on the MASTER_GND return path.
- K6 de-energized: MASTER_GND is disconnected from board GND through K6.
- K6 energized: MASTER_GND is connected to board GND.

The existing MASTER_GND-referenced all-channel calibration dataset is accepted and must not be repeated.

Remaining Package 2 question is narrower: determine only where measurement operation **depends on** that reference being present, especially cable test and any special family whose behavior cannot be inferred from the accepted dataset.

Do not rerun all channels merely to prove that MASTER_GND-referenced data exists; repository authority already records that dataset as PASS.

---

## 2.5 CD40106 threshold margin

Objective: capture the real Schmitt-input and digital-output behavior at the required heavy-vehicle source levels.

Required source points:

- 22V
- 24V
- 28V

GPIO36 / `SAG_PULS` and GPIO39 / `SOL_PULS` are the frozen ESP32 pulse inputs behind the CD40106 stage.

For each verified pulse path, record:

- exact source voltage,
- CD40106 Schmitt-input node voltage,
- digital output state/waveform,
- any marginal or unstable switching behavior.

Do not freeze a numerical threshold until the later review concludes the evidence is sufficient.

---

## 2.6 CAN `_R` state dependency

Objective: determine whether `_R` measurement conversion depends on the selected CAN relay/path or whether a differential/delta approach can remove that dependency.

Authoritative `_R` channels:

- `CANH_1_R` = AIN3 step 000.
- `CANL_1_R` = AIN3 step 001.
- `CANH_2_R` = AIN3 step 010.
- `CANL_2_R` = AIN2 step 101.

CAN relay identities:

- K2 = ISO7638 tractor / CK.
- K3 = ISO12098 tractor / CK.
- K4 = ISO7638 trailer / DR.
- K5 = ISO12098 trailer / DR.

Preconditions:

- external CAN circuit de-energized,
- only one CAN relay energized at a time,
- changes between CAN paths pass through all-CAN-relays-OFF.

Required missing evidence:

- all-CAN-relays-OFF `_R` baseline,
- same external CAN condition with the appropriate single relay selected,
- change attributable solely to relay/path state.

Do not implement either relay-state-aware conversion or delta conversion during Package 2.

---

## Completion rule

1. Reuse prior accepted evidence instead of repeating it.
2. Collect only facts that remain genuinely missing.
3. Mark unresolved facts `PENDING`; never replace them with inference.
4. Do not create Package 3 conversion constants until Package 2 receives a dedicated BENCH review.
