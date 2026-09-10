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

---

## 2.1 K1 default contact state

Direct physical verification:

- K1 de-energized: `SELECT_V` is connected to the 3.3V path.
- K1 energized: `SELECT_V` switches to the 24V path through K1.
- Exact contact resistance was not recorded and is not invented here.

Verdict: **BENCH PASS**

---

## 2.2 ISO7638 GND1 / GND2 reference behavior

Repository authority already records that the valid REV-2 calibration dataset was re-captured with MASTER_GND reference included. The accepted source set is 0V, 3V, 12V, 18V, 24V and 30V. Older pre-MASTER_GND captures are invalid.

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

Still genuinely missing unless recovered from prior accepted bench records:

- Actual installed shunt value / marking.

Verdict: **PENDING EVIDENCE RECOVERY OR SINGLE DIRECT SHUNT IDENTIFICATION**

---

## 2.4 MASTER_GND / K6 return path

Direct physical/topology verification:

- K6 is normally open on the MASTER_GND return path.
- K6 de-energized: MASTER_GND is disconnected from board GND through K6.
- K6 energized: MASTER_GND is connected to board GND.
- Manual MASTER_GND-to-GND connection reproduces the referenced state.
- With no external connector energy, the observed GND-sense level changes from approximately 3V with MASTER_GND open to approximately 0V when MASTER_GND is connected to board GND.

Existing authority also records that the valid all-channel calibration capture used MASTER_GND reference. That accepted capture is not to be repeated.

Still genuinely missing only if not recoverable from prior records:

- Whether cable-test operation requires the MASTER_GND reference in the final intended workflow.
- Any special measurement-family dependency not already demonstrated by the accepted calibration dataset.

Verdict: **PARTIAL BENCH PASS — K6 TOPOLOGY AND REFERENCE EFFECT VERIFIED; DO NOT REPEAT ACCEPTED ALL-CHANNEL DATASET**

---

## 2.5 CD40106 threshold margin

Existing accepted facts:

- GPIO36 / `SAG_PULS` and GPIO39 / `SOL_PULS` mapping is frozen.
- Pulse firmware records digital edge/live-level evidence and does not itself define the analog Schmitt threshold.

Before requesting any new 22V/24V/28V scope work, prior bench records must be searched and reused if this characterization was already performed.

Verdict: **PENDING EVIDENCE RECOVERY FIRST; NEW BENCH ONLY IF ABSENT**

---

## 2.6 CAN `_R` state dependency

Existing accepted facts:

- Direct connector CAN channels and `_R` channels are separate measurement families.
- `_R` channel identities / MUX mapping are frozen.
- CAN termination measurement requires an externally de-energized circuit.
- One-CAN-relay-at-a-time safety interlock is authoritative.

Before requesting new relay-state comparison measurements, prior CAN termination / `_R` bench records must be searched and reused if present.

Verdict: **PENDING EVIDENCE RECOVERY FIRST; NEW BENCH ONLY IF ABSENT**

---

## Package 2 gate

Package 2 closes by auditing and recovering the evidence already produced during REV-2 development, then collecting only truly missing physical facts.

Current status: **BENCH REVIEW IN PROGRESS — REUSE PRIOR EVIDENCE; NO BLANKET RETESTING**
