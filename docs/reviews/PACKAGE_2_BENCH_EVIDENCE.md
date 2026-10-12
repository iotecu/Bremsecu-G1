# BREMSECU G1 REV-2 — Package 2 Bench Evidence

Status: PACKAGE 2 REVIEW COMPLETE / INTEGRATED PULSE TEST DEFERRED
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`
Procedure: `docs/reviews/PACKAGE_2_BENCH_PROCEDURE.md`

## Evidence reuse rule

Package 2 is an audit/verification gate, not a command to repeat already accepted bench work.

- Reuse prior verified REV-2 bench evidence where repository authority already records it.
- Do not ask the operator to recreate an accepted measurement merely because the remediation plan lists that topic again.
- New bench work is required only for a genuinely missing fact that can be validly measured in the present hardware state.
- Do not promote partial-power or non-operational observations into system-level failures.
- Do not invent coefficients, thresholds, shunt values, relay-state effects, or conversion models.

---

## 2.1 K1 default contact state

Direct physical verification:

- K1 de-energized: `SELECT_V` is connected to the 3.3V path.
- K1 energized: `SELECT_V` switches to the 24V path through K1.

Verdict: **BENCH PASS**

---

## 2.2 ISO7638 GND1 / GND2 reference behavior

Repository authority records that the valid REV-2 calibration dataset was captured with MASTER_GND reference included. The accepted source set is 0V, 3V, 12V, 18V, 24V and 30V. Older pre-MASTER_GND captures are not used as final authority.

Additional direct Package 2 observation:

- Board energized, no external energy applied to connector pin inputs.
- MASTER_GND open: observed GND-sense level approximately 3V.
- MASTER_GND manually connected to board GND: observed GND-sense level approximately 0V.

Verdict: **EXISTING BENCH EVIDENCE ACCEPTED; NO REPEAT SWEEP REQUIRED**

---

## 2.3 INA226 shunt

Accepted evidence:

- INA226 I2C/device operation passed bring-up.
- INA226 bus-voltage reading passed bring-up.
- Installed/planned shunt marking confirmed as **R010**.
- `R010` = nominal **0.010 ohm (10 milliohm)**.

Verdict: **BENCH PASS — R010 / NOMINAL 10 mOhm**

---

## 2.4 MASTER_GND / K6 return path

Accepted physical/topology evidence:

- K6 is normally open on the MASTER_GND return path.
- K6 de-energized: MASTER_GND is disconnected from board GND through K6.
- K6 energized: MASTER_GND is connected to board GND.
- Manual MASTER_GND-to-GND connection reproduces the referenced state.
- With no external connector energy, the observed GND-sense level changes from approximately 3V with MASTER_GND open to approximately 0V when MASTER_GND is connected to board GND.

Cable-test policy remains:

- **K1 OFF / 3.3V cable test**.
- **K6 / MASTER_GND OFF** for the controlled cable continuity/cross-scan workflow.

Verdict: **PASS**

---

## 2.5 CD40106 pulse path

Frozen logical path:

- `15P_SAG_SINYAL` -> U9 pin 1 (`1A`)
- U9 pin 2 (`1Y`) -> `SAG_PULS` / GPIO36
- `15P_SOL_SINYAL` -> U9 pin 3 (`2A`)
- U9 pin 4 (`2Y`) -> `SOL_PULS` / GPIO39

A static partial-state check was performed while the complete board/ESP pulse workflow was not operating. The following values were observed during that incomplete condition:

| Applied bench input | U9 pin 1 | U9 pin 2 |
| ---: | ---: | ---: |
| 22V | 1.49V | 3.28V |
| 24V | 1.54V | 3.28V |
| 28V | 1.64V | 3.28V |

### Correction to earlier interpretation

These readings are **not valid evidence of a CD40106 hardware failure**.

Reason:

- The complete REV-2 card was not yet operating in its intended functional state.
- ESP/pulse processing was not active as an integrated system.
- A real 400ms HIGH/LOW pulse cycle or equivalent controlled functional stimulus was not being observed end-to-end.
- Therefore the static readings cannot be promoted into a system-level PASS/FAIL conclusion.

The earlier statement that the CD40106 path had failed at 22/24/28V is withdrawn.

Correct verification method:

- When the card is operational, exercise the actual pulse path with the intended HIGH/LOW stimulus (historically 400ms cadence or equivalent controlled test).
- Confirm U9 input/output inversion and GPIO36/GPIO39 pulse detection end-to-end.
- If an analog margin check is still desired, perform it while the complete path is in a valid operating configuration.

Verdict: **INCONCLUSIVE STATIC OBSERVATION — NOT A PACKAGE 2 BLOCKER; INTEGRATED PULSE VERIFICATION DEFERRED UNTIL CARD FUNCTIONAL BRING-UP**

---

## 2.6 CAN `_R` state dependency

Authority/topology:

- ISO7638: `CANH_1_R` / `CANL_1_R`.
- ISO12098: `CANH_2_R` / `CANL_2_R`.
- Reference network: **3.3V -> 1.5k -> CAN-H -> external termination resistance -> CAN-L -> 1.5k -> GND**.
- External CAN circuit must be de-energized.
- One selector relay is active for the selected side.

For nominal 120 ohm termination, design-derived expected values are approximately:

- `CANH_R` = **1.71V**
- `CANL_R` = **1.59V**
- `H-L delta` = **0.127V**

Open-circuit design expectation is approximately H=3.3V / L=0V.

REV-2 interpretation:

- `_R` is a relay-selected resistance-test family, not a live CAN-voltage family.
- H-L delta is the primary resistance-sensitive quantity.
- Absolute H/L values are plausibility checks.
- Final production tolerance windows remain a later calibration/classification item.

Verdict: **DESIGN/TOPOLOGY CLOSED FOR PACKAGE 2**

---

## Package 2 gate

Closed/recovered for the current stage:

- K1 source selection.
- MASTER_GND/K6 topology and reference behavior.
- Existing MASTER_GND-referenced calibration evidence.
- INA226 R010 shunt identity.
- Cable-test K6 policy.
- CAN `_R` topology and nominal design behavior.

Deferred to the correct functional bring-up point:

- CD40106 / GPIO36 / GPIO39 end-to-end pulse verification on an operating card.

The invalid earlier CD40106 FAIL finding is removed from Package 2 authority.

Current status: **PACKAGE 2 REVIEW COMPLETE FOR CURRENT HARDWARE STATE — INTEGRATED PULSE FUNCTIONAL TEST DEFERRED, NOT FAILED**
