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

The recovery audit specifically searched for:

- installed INA226 shunt marking / resistance,
- CD40106 bench/scope observations at 22V, 24V and 28V,
- `CANH_1_R`, `CANL_1_R`, `CANH_2_R`, `CANL_2_R` relay-state/termination measurements,
- cable-test behavior with and without MASTER_GND/K6.

Recovered material includes the accepted MASTER_GND-referenced calibration record, the original `BREMSECU_G1_V2_MASTER_NET_MAP_v1.3`, the REV-2 schematic, bring-up records, retained firmware/evidence modules and the independent schematic/remediation review.

The independent review itself explicitly identified INA226 shunt value, CD40106 22/24/28V margin, CAN `_R` relay-state dependency and cable-test K6 dependency as unresolved/bench-required where no direct physical evidence was available. No later retained measurement log was recovered that closes those specific facts.

Historical pre-MASTER_GND numeric calibration values are not promoted to authority; current calibration authority explicitly invalidates older pre-MASTER_GND captures for final coefficients.

A generic product image showing an INA226-style board or resistor marking is not accepted as proof of the resistor actually installed on the REV-2 prototype.

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
- MASTER NET MAP identifies the installed interface as an MDL1 / CJMCU-226-style module and defines the IN+/IN-/VBS path, but does not specify the module's physical shunt resistance.

Evidence-recovery result:

- No authoritative retained record of the **actual installed module's** shunt marking/value was recovered.
- No resistor value is inferred from a generic module photo.

Verdict: **GENUINELY MISSING — SINGLE PHYSICAL SHUNT IDENTIFICATION REQUIRED**

---

## 2.4 MASTER_GND / K6 return path

Direct physical/topology verification:

- K6 is normally open on the MASTER_GND return path.
- K6 de-energized: MASTER_GND is disconnected from board GND through K6.
- K6 energized: MASTER_GND is connected to board GND.
- Manual MASTER_GND-to-GND connection reproduces the referenced state.
- With no external connector energy, the observed GND-sense level changes from approximately 3V with MASTER_GND open to approximately 0V when MASTER_GND is connected to board GND.

Existing authority records that the valid all-channel calibration capture used MASTER_GND reference. That accepted capture is not repeated.

Evidence-recovery result:

- No retained direct cable-test comparison with MASTER_GND connected versus disconnected was recovered.
- Schematic topology may suggest a behavior, but Package 2 does not convert that inference into a physical fact.

Verdict: **PARTIAL BENCH PASS — K6 TOPOLOGY/REFERENCE EFFECT VERIFIED; CABLE-TEST DEPENDENCY GENUINELY UNRESOLVED**

---

## 2.5 CD40106 threshold margin

Existing accepted facts:

- U9 is the 3.3V CD40106 pulse-conditioning stage.
- `SAG_PULS` / GPIO36 and `SOL_PULS` / GPIO39 mapping is frozen.
- Pulse firmware records digital edge/live-level evidence; it does not define the analog Schmitt threshold.
- The independent schematic review identified the divider-to-Schmitt threshold margin as potentially narrow, but explicitly did **not** claim a bench-verified threshold.

Evidence-recovery result:

- No retained direct bench/scope observations at 22V, 24V and 28V were recovered.
- Legacy pulse code demonstrates use of the CD40106 path but is not evidence of the required analog threshold-margin characterization.

Verdict: **GENUINELY MISSING — 22V / 24V / 28V PHYSICAL CHARACTERIZATION REQUIRED**

---

## 2.6 CAN `_R` state dependency

Existing accepted facts:

- Direct connector CAN channels and `_R` channels are separate measurement families.
- `_R` channel identities / MUX mapping are frozen.
- MASTER NET MAP defines the termination reference network: 3.3V through 1.5k to selected CAN-H and selected CAN-L through 1.5k to GND.
- CAN termination measurement requires an externally de-energized circuit.
- One-CAN-relay-at-a-time safety interlock is authoritative.

Evidence-recovery result:

- No retained physical dataset comparing the same CAN condition with all CAN relays OFF versus the selected relay/path ON was recovered.
- The independent review proposed relay-state-aware conversion versus H-L delta as alternatives, but explicitly left the engineering choice bench-dependent.

Verdict: **GENUINELY MISSING — RELAY-STATE / DELTA CHARACTERIZATION REQUIRED**

---

## Package 2 gate

Recovered/closed without repeat testing:

- K1 default source selection.
- MASTER_GND/K6 physical contact topology.
- MASTER_GND open-vs-grounded GND-sense contrast.
- Existing MASTER_GND-referenced calibration dataset and its valid source points.
- Existing INA226 device/bus-voltage bring-up evidence.
- Existing pulse/CAN mapping and termination-reference topology.

After evidence recovery, only these physical facts remain genuinely unresolved:

1. actual installed INA226 shunt marking/value,
2. cable-test dependency on MASTER_GND/K6,
3. CD40106 behavior/margin at 22V, 24V and 28V,
4. CAN `_R` relay-state dependency versus a verified delta method.

Current status: **BENCH REVIEW IN PROGRESS — FOUR GENUINELY MISSING PHYSICAL FACTS REMAIN; NO BLANKET RETESTING**
