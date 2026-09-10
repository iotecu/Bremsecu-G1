# BREMSECU G1 REV-2 — Package 2 Bench Evidence

Status: BENCH REVIEW IN PROGRESS
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`
Procedure: `docs/reviews/PACKAGE_2_BENCH_PROCEDURE.md`

## Evidence reuse rule

Package 2 is an audit/verification gate, not a command to repeat already accepted bench work.

- Reuse prior verified REV-2 bench evidence where repository authority already records it.
- Do not ask the operator to recreate an accepted measurement merely because the remediation plan lists that topic again.
- New bench work is required only for a genuinely missing fact that cannot be established from accepted evidence.
- Do not invent coefficients, thresholds, shunt values, relay-state effects, or conversion models.

## Prior-evidence recovery audit — 2026-09-10

Repository authority, retained REV-2 files, File Library material and recoverable prior project context were searched before declaring any item missing.

Recovered material includes the accepted MASTER_GND-referenced calibration record, the original `BREMSECU_G1_V2_MASTER_NET_MAP_v1.3`, the REV-2 schematic, bring-up records, retained firmware/evidence modules, historical working cable-test firmware, and the independent schematic/remediation review.

Historical pre-MASTER_GND numeric calibration values are not promoted to authority; current calibration authority explicitly invalidates older pre-MASTER_GND captures for final coefficients.

---

## 2.1 K1 default contact state

Direct physical verification:

- K1 de-energized: `SELECT_V` is connected to the 3.3V path.
- K1 energized: `SELECT_V` switches to the 24V path through K1.
- Exact contact resistance was not recorded and is not invented here.

Verdict: **BENCH PASS**

---

## 2.2 ISO7638 GND1 / GND2 reference behavior

Repository authority records that the valid REV-2 calibration dataset was re-captured with MASTER_GND reference included. The accepted source set is 0V, 3V, 12V, 18V, 24V and 30V. Older pre-MASTER_GND captures are invalid.

That accepted dataset is reused; it is not to be re-captured for Package 2.

Additional direct Package 2 observation:

- Board energized, no external energy applied to connector pin inputs.
- MASTER_GND open: observed GND-sense level approximately 3V.
- MASTER_GND manually connected to board GND: observed GND-sense level approximately 0V.

This confirms the intended open-reference versus grounded-reference contrast. Final numerical GND PASS/WARN/FAIL thresholds remain a separate pending characterization item and are not invented from these approximate values.

Verdict: **EXISTING BENCH EVIDENCE ACCEPTED; NO REPEAT SWEEP REQUIRED**

---

## 2.3 INA226 shunt

Existing accepted evidence:

- INA226 I2C/device operation passed bring-up.
- INA226 bus-voltage reading passed bring-up.
- Current conversion remains calibration-gated in firmware.
- MASTER NET MAP identifies the installed interface as an MDL1 / CJMCU-226-style module and defines the IN+/IN-/VBS path.

Direct Package 2 hardware identification:

- Operator confirmed the installed/planned shunt marking is **R010**.
- `R010` corresponds to nominal **0.010 ohm (10 milliohm)**.
- This is component-marking evidence; no higher-precision Kelvin resistance measurement is claimed.

Verdict: **BENCH PASS — INSTALLED SHUNT MARKING R010 / NOMINAL 10 mOhm**

---

## 2.4 MASTER_GND / K6 return path

Direct physical/topology verification:

- K6 is normally open on the MASTER_GND return path.
- K6 de-energized: MASTER_GND is disconnected from board GND through K6.
- K6 energized: MASTER_GND is connected to board GND.
- Manual MASTER_GND-to-GND connection reproduces the referenced state.
- With no external connector energy, the observed GND-sense level changes from approximately 3V with MASTER_GND open to approximately 0V when MASTER_GND is connected to board GND.

Existing authority records that the valid all-channel calibration capture used MASTER_GND reference. That accepted capture is not repeated.

### Cable-test K6 policy review

Recovered working firmware from 2026-06-04 explicitly performs the 3.3V cable test with its prior GND-reference relays released. The current REV-2 `TestEngine` starts every test from all outputs OFF, enters cable baseline/focus operation without asserting K6, and reserves K6 switching for live voltage/GND validation.

The REV-2 specification policy is therefore frozen as:

- **Cable test: K6 / MASTER_GND remains OFF.**
- K6 is not asserted merely to perform controlled 3.3V cable continuity/cross-scan.
- A future hardware revision that changes the continuity return topology must explicitly reopen this decision.

Verdict: **PASS — K6 TOPOLOGY VERIFIED; CABLE-TEST K6 POLICY = OFF**

---

## 2.5 CD40106 threshold margin

Frozen path under test:

- `15P_SAG_SINYAL` -> U9 pin 1 (`1A`)
- U9 pin 2 (`1Y`) -> `SAG_PULS` / GPIO36
- U9 VDD = 3.3V

Direct Package 2 bench observations:

| Applied vehicle-side input | U9 pin 1 / 1A | U9 pin 2 / 1Y | Observed digital state |
| ---: | ---: | ---: | --- |
| 22V | 1.49V | 3.28V | HIGH; no inversion/output transition observed |
| 24V | 1.54V | 3.28V | HIGH; no inversion/output transition observed |
| 28V | 1.64V | 3.28V | HIGH; no inversion/output transition observed |

Physical conclusion:

- Across the required 22V, 24V and 28V source points, U9 pin 1 increased from 1.49V to 1.64V but U9 pin 2 remained at 3.28V.
- The positive vehicle-side signal therefore did **not** produce the expected inverter output transition anywhere in the tested 22-28V range.
- The exact CD40106 switching threshold is not inferred from these measurements.
- This result does not identify the root cause by itself; it establishes that the present built path does not demonstrate the required operating-range switching margin.

Verdict: **BENCH EVIDENCE COMPLETE — FAIL: NO CD40106 OUTPUT TRANSITION AT 22V / 24V / 28V; HARDWARE PATH/MARGIN REMEDIATION REQUIRED**

---

## 2.6 CAN `_R` state dependency

Authority/topology:

- ISO7638 selected measurement pair: `CANH_1_R` / `CANL_1_R`.
- ISO12098 selected measurement pair: `CANH_2_R` / `CANL_2_R`.
- Reference network: **3.3V -> 1.5k -> CAN-H -> external termination resistance -> CAN-L -> 1.5k -> GND**.
- External circuit must be de-energized before this test.
- Exactly one CAN selector relay is energized for the selected side.

For a nominal **120 ohm** termination resistance, the design-derived expected node values are:

- `CANH_R` approximately **1.71V**
- `CANL_R` approximately **1.59V**
- `CANH_R - CANL_R` approximately **0.127V**

Calculation basis:

- Total resistance = 1500 + 120 + 1500 = 3120 ohm
- Test current = 3.3V / 3120 ohm approximately 1.058mA
- `CANL_R` = 1.058mA x 1500 ohm approximately 1.59V
- `CANH_R` = `CANL_R` + (1.058mA x 120 ohm) approximately 1.71V

With no selected external resistance connected, the reference network tends toward its open-state endpoints:

- `CANH_R` approximately **3.3V**
- `CANL_R` approximately **0V**

Engineering decision for REV-2:

- The `_R` channels are interpreted as a **relay-selected resistance-test family**, not as ordinary live CAN voltage channels.
- Their expected behavior is defined by the fixed 3.3V / 1.5k / unknown-R / 1.5k reference network.
- H-L delta is the primary resistance-sensitive quantity; absolute H and L values remain useful plausibility checks.
- Exact production PASS/WARN/FAIL tolerance windows remain a later calibration item and are not invented here.
- No additional operator bench sweep is required for Package 2 merely to re-prove this basic divider behavior.

Verdict: **DESIGN/TOPOLOGY CLOSED — NOMINAL 120 OHM EXPECTATION = H 1.71V / L 1.59V / DELTA 0.127V**

---

## Package 2 gate

Closed/recovered items:

- K1 default source selection.
- MASTER_GND/K6 physical contact topology.
- MASTER_GND open-vs-grounded GND-sense contrast.
- Existing MASTER_GND-referenced calibration dataset and valid source points.
- INA226 device/bus-voltage bring-up evidence.
- INA226 shunt marking: **R010 = nominal 10 mOhm**.
- Cable-test K6 policy: **OFF**.
- CAN `_R` topology/expected nominal behavior: **closed by authoritative network calculation**.
- CD40106 22V/24V/28V physical characterization: **evidence complete, hardware margin/path FAIL found**.

Blocking hardware finding:

1. CD40106 pulse-conditioning path must be remediated and then re-verified before Package 2 can receive an unqualified BENCH PASS.

Current status: **BENCH REVIEW IN PROGRESS — NO REMAINING CAN_R EVIDENCE GAP; ONE CONFIRMED CD40106 HARDWARE FINDING REQUIRES REMEDIATION**
