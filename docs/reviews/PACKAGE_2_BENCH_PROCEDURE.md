# BREMSECU G1 REV-2 — Package 2 Bench Procedure

Status: PROCEDURE READY / RESULTS PENDING
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Evidence record: `docs/reviews/PACKAGE_2_BENCH_EVIDENCE.md`
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`

## Scope

This procedure exists only to collect the missing Package 2 bench evidence. It does not authorize new firmware logic, thresholds, conversion constants, relay mappings, or calibration coefficients.

Repository authority already fixes the following behavioral rules:

- K1 OFF selects the 3.3V cable-test source; K1 ON selects the 24V load source.
- Cable test is 3.3V only.
- K6 is the controlled MASTER_GND measurement reference.
- Ground validation is measured K6 ON -> K6 OFF -> K6 restored.
- CAN direct connector channels and `_R` channels are different measurement families.
- At most one of K2/K3/K4/K5 may be energized at a time.
- CAN termination measurements require the external circuit to be de-energized.
- PENDING engineering values must not be guessed.

Use `PACKAGE_2_BENCH_EVIDENCE.md` as the only result record for this procedure.

---

## General bench rules

1. Record the exact prototype / board revision used.
2. Record instrument model where useful and whether the reading is DMM, scope, bench supply, visual marking, or firmware ADC evidence.
3. For resistance / continuity checks, remove board power unless the specific step explicitly requires an energized state.
4. Change one state at a time. Do not combine K1, K6, CAN-relay, and output changes unless the step explicitly requires that combination.
5. Before CAN `_R` characterization, verify the external CAN circuit is de-energized.
6. Do not convert node readings using ideal divider math during Package 2. Record raw observed values first.
7. If a test point, net identity, relay state, or source path is uncertain, stop that item and record `PENDING — identity not verified` rather than guessing.

---

# 2.1 K1 default contact state

Objective: physically verify the de-energized contact state of K1 / `SELECT_V`.

### Setup

- Board power removed.
- K1 de-energized.
- DMM in continuity or resistance mode.

### Sequence

1. Measure `SELECT_V <-> 3.3V`.
2. Record resistance / continuity result.
3. Measure `SELECT_V <-> 24V`.
4. Record resistance / continuity result.
5. Do not infer contact state from relay labeling alone; use the measured result.

### Required evidence

- `SELECT_V <-> 3.3V` measured result.
- `SELECT_V <-> 24V` measured result.
- Instrument / method note.

Expected design intent in the current authority is K1 de-energized = 3.3V and energized = 24V. The Package 2 verdict must follow the physical measurement.

---

# 2.2 ISO7638 GND1 / GND2 transfer behavior

Objective: determine the real transfer behavior of `7P_GND1` and `7P_GND2` without treating them as ordinary 100k/10k channels.

Authoritative channel identity:

- `7P_GND1` = ISO7638 pin 3, ADC/MUX AIN0 step 000.
- `7P_GND2` = ISO7638 pin 4, ADC/MUX AIN0 step 011.

Existing valid calibration source set:

- 0V
- 3V
- 12V
- 18V
- 24V
- 30V

### Sequence for each GND channel

For `7P_GND1`, then repeat identically for `7P_GND2`:

1. Confirm K1 is OFF unless a separate verified bench setup requires otherwise.
2. Energize K6 / MASTER_GND.
3. Apply the known source point to the channel under test.
4. Record the applied source voltage.
5. Record the measured analog node voltage if accessible.
6. Record raw ADS / node-domain firmware evidence if available.
7. Release K6 without changing the applied source.
8. Record the same measurements with K6 OFF.
9. Restore K6 before moving to the next source point.
10. Repeat for 0, 3, 12, 18, 24 and 30V.

### Required evidence

For both GND1 and GND2, retain paired K6-ON and K6-OFF observations for all available source points. Do not fit coefficients yet; Package 2 captures physical behavior only.

---

# 2.3 INA226 shunt

Objective: identify the actual shunt resistance used by the installed INA226 module.

Existing bring-up only proves INA226 I2C and bus-voltage operation; current/shunt calibration is still open.

### Sequence

1. Remove power before direct resistance measurement.
2. Photograph or record the shunt resistor marking if readable.
3. Record the value implied by the component marking, but label it as `MARKING` evidence rather than final measured resistance.
4. Measure the installed shunt resistance if the available instrument/method can resolve the low resistance reliably.
5. If ordinary lead resistance is comparable to the expected shunt value, do not subtract a guessed lead value. Record the limitation; use a suitable low-resistance / Kelvin method when available.
6. Record both marking evidence and measured evidence separately.

### Required evidence

- Shunt marking.
- Measured shunt resistance or explicit measurement limitation.
- Measurement method.

No current conversion constant or lamp-current threshold is authorized by Package 2 until the real shunt value is established.

---

# 2.4 MASTER_GND / K6 return-path verification

Objective: determine what K6 physically changes for cable test and each measurement/calibration family.

Measurement families already defined by authority:

1. Normal divided vehicle-voltage channels.
2. GND-sense channels.
3. Direct connector CAN channels.
4. CAN `_R` relay-path channels.

### 2.4-A Cable test dependency

1. Keep K1 OFF; cable test is 3.3V only.
2. Select one known cable-test output and its authoritative expected return channel.
3. Apply only that one cable-test output.
4. With K6 ON, record source/return measurement evidence.
5. Release K6 without changing the selected output.
6. Record the same evidence with K6 OFF.
7. Restore K6.
8. Return the cable output to OFF.

Record whether the cable-test measurement remains physically valid with K6 open.

### 2.4-B Calibration-family dependency

For one verified representative channel from each family, compare the same stable applied condition with K6 ON and K6 OFF:

- normal divided vehicle-voltage channel,
- GND-sense channel,
- direct connector CAN channel,
- CAN `_R` channel using its correct de-energized CAN test condition.

Do not compare different source conditions between K6 states.

### Required evidence

For each family record:

- channel name,
- applied condition,
- K6 ON result,
- K6 OFF result,
- whether K6 is physically required for a stable/meaningful measurement.

Also record what happens electrically when K6 is open; do not convert that observation directly into a firmware rule until reviewed.

---

# 2.5 CD40106 threshold margin

Objective: capture the real Schmitt-input and digital-output behavior at the required heavy-vehicle source levels.

The remediation authority requires measurements at minimum:

- 22V
- 24V
- 28V

GPIO36 / `SAG_PULS` and GPIO39 / `SOL_PULS` are the frozen ESP32 pulse inputs behind the CD40106 stage. Do not alter that mapping during this test.

### Sequence

For each pulse path that can be safely accessed and positively identified:

1. Apply 22V to the intended external pulse-input path.
2. Measure the corresponding CD40106 Schmitt-input node voltage with a DMM and preferably a scope.
3. Record the CD40106 digital output state / waveform.
4. Record the corresponding ESP32 input behavior if observable without changing firmware semantics.
5. Repeat at 24V.
6. Repeat at 28V.
7. Repeat the sequence for the other pulse path.

### Required evidence

For each tested path and source voltage:

- exact external source voltage,
- Schmitt-input node voltage,
- digital output state/waveform,
- any instability, oscillation, marginal switching or unexpected behavior.

Do not freeze a numerical threshold from these three points alone unless the later review explicitly concludes that the dataset is sufficient.

---

# 2.6 CAN `_R` state dependency

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

### Preconditions

- External CAN circuit de-energized.
- Only one of K2/K3/K4/K5 energized at a time.
- When changing CAN path, pass through all-CAN-relays-OFF.

### Sequence

For each relevant CAN side / connector path:

1. Start with all CAN relays OFF and record the `_R` channel baseline.
2. Select the single authoritative CAN relay for the path.
3. Record the corresponding CANH `_R` and CANL `_R` node/ADC evidence.
4. Return all CAN relays OFF.
5. Repeat the same applied external condition for the comparison relay/path where physically meaningful.
6. Keep the external CAN condition unchanged while comparing relay states.
7. Record direct connector CAN channels separately; do not merge them numerically with `_R` observations.

### Required evidence

- relay/path state,
- external CAN condition,
- CANH `_R` observation,
- CANL `_R` observation,
- all-relays-OFF baseline,
- observed change caused solely by relay/path state.

Package 2 must end with evidence strong enough to answer one question only:

**Does `_R` engineering conversion require relay-state knowledge, or can the termination diagnostic use a verified differential/delta method that cancels relay-contact/path effects?**

Do not implement either approach during Package 2.

---

# Completion rule

After all measurements are entered into `PACKAGE_2_BENCH_EVIDENCE.md`:

1. Compare the evidence against the Package 2 questions only.
2. Mark unresolved observations `PENDING`; never replace them with inferred values.
3. Do not create Package 3 conversion constants until Package 2 receives a dedicated `BENCH PASS` review.
