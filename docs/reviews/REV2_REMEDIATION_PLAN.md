# BREMSECU G1 REV-2 — Remediation Plan

Status: REVIEW CANDIDATE
Authority basis: independent repo review + schematic review + current repository authority documents.
Implementation is NOT authorized by this document alone. Qwen must not change firmware from this plan until the independent reviewer returns PLAN PASS on this exact file.

## 0. Review outcome

Independent review decision: **APPROVE WITH CHANGES**.

The proposed architecture remains valid:

`AdcService -> channel-specific conversion/calibration layer -> TestEngine`

This separation is already anticipated by the repository:

- `AdcService` owns raw ADC codes and ADS/node voltage only.
- `CalibrationStore` owns opaque persistence/integrity only.
- Measurement-family conversion belongs in a separate layer.
- Diagnostic thresholds are intended to operate in pin/engineering-voltage domain.

The critical ordering change is that interlock/state-preservation and required bench verification must precede conversion-layer activation.

---

# HARD RULES

These rules apply to every implementation package below.

1. Do not invent any PENDING engineering value.
2. Do not modify schematic-verified mappings unless a later hardware authority explicitly changes them.
3. Do not use raw/node voltage directly against pin-domain diagnostic thresholds.
4. Do not allow field-specific TPIC operations to overwrite unrelated safety state.
5. Do not mark a diagnostic result PASS/FAIL when the required conversion/calibration authority is unavailable.
6. Do not merge a package unless its stated build/test/review gate passes.
7. Keep production-hardening changes separate from measurement/safety corrections unless the plan explicitly couples them.

### Frozen / do-not-touch without new authority

The schematic review confirmed the following and they are not remediation targets:

- `channels.h` 26-channel ADC/MUX mapping
- ISO 7638 / ISO 12098 socket pin mapping
- TPIC output mapping
- CAN relay mapping
- `LOAD_OUTPUT_MASK`
- ADS1115 address assumption `0x48`
- TPIC safe-boot sequence: outputs disabled -> shift zero word -> latch -> enable
- GPIO36/GPIO39 input usage behind the CD40106 stage

---

# IMPLEMENTATION ORDER

## Package 0 — Build Gate, Toolchain Pinning, CI

### Objective
Establish a deterministic build gate before functional changes.

### Required changes

1. Fix the `shorts` / `shortcuts` compile-name mismatch wherever present.
2. Pin the ESP32 PlatformIO platform version in `firmware/platformio.ini`.
3. Preserve already-frozen library versions.
4. Add GitHub CI that runs a real firmware build.

### Acceptance criteria

- `pio run` succeeds from a clean checkout.
- CI runs the same build automatically.
- No functional behavior changes are mixed into this package except those strictly required to compile.

---

## Package 1 — TPIC Interlock Field-Update Semantics

### Why this is a prerequisite
Current CAN helpers preserve unrelated TPIC state, but several `apply*` functions overwrite the whole output word. This means combinations such as cable output ON + K6 ON cannot currently be represented reliably.

### Required changes

1. Convert these functions from whole-word replacement to field-update semantics:
   - cable-test output application
   - measurement-reference application
   - load-output application
2. Preserve unrelated safety fields unless the operation is explicitly a global safe-state reset.
3. Use the existing CAN functions as the behavioral pattern:
   - `clearCanSelection()`
   - `energizeCanRelay()`
4. Whole-word writes are allowed only for explicit global-safe-state operations such as all-outputs-off / fault-safe initialization.

### Mandatory invariants

- K2/K3/K4/K5 mutual exclusion remains intact.
- K1 changes must not silently clear K6.
- K6 changes must not silently clear the selected diagnostic output.
- Cable-output changes must not silently alter CAN selection or unrelated control bits.
- Load-output changes must not silently clear unrelated required safety state.

### Acceptance criteria

- Host-side or unit tests prove state preservation for each field-update helper.
- `pio run` passes.
- Independent reviewer returns PASS on this package before Package 3 is activated.

---

## Package 2 — Bench Verification Gate

No conversion constants or safety assumptions may be filled in from inference.

### 2.1 K1 default contact state
Verify with K1 de-energized:

- `SELECT_V <-> 3.3V`
- `SELECT_V <-> 24V`

Expected design intent: de-energized = 3.3V, energized = 24V.

### 2.2 ISO7638 GND1 / GND2 transfer behavior
Determine the real transfer function for:

- `7P_GND1`
- `7P_GND2`

Do not assume the standard 100k/10k family model.

### 2.3 INA226 shunt
Read/measure the actual shunt value on the INA226 module.

Do not hard-code current conversion until this is known.

### 2.4 MASTER_GND / K6 return path
Physically verify the intended reference path and answer:

- Is K6 required during cable test?
- Is K6 required during each calibration family?
- What happens electrically when K6 is open?

### 2.5 CD40106 threshold margin
Bench/scope verification at minimum:

- 22V input
- 24V input
- 28V input

Record Schmitt input node voltage and digital output behavior.

### 2.6 CAN `_R` state dependency
Determine whether `_R` conversion requires relay-state input or whether the termination diagnostic should use a differential/delta method that cancels relay-contact effects.

No final implementation choice until this is bench-supported.

### Output of this package
A documented bench evidence set. No guessed coefficients.

---

## Package 3 — Measurement Conversion / Calibration Layer

### Architecture

Keep the public role of `AdcService` unchanged:

`RAW ADC -> ADS/NODE VOLTAGE`

Add a separate conversion layer:

`ADS/NODE VOLTAGE -> CALIBRATED PIN/ENGINEERING VOLTAGE`

### Requirements

1. No global `x11` conversion.
2. Conversion must be family/channel aware.
3. Families include at minimum:
   - normal divided vehicle-voltage channels
   - GND-sense channels
   - connector CAN channels
   - CAN `_R` channels
4. `_R` channels may require relay state or a distinct differential model; resolve only from Package 2 evidence.
5. A channel with missing conversion authority must return an explicit non-valid status, never a fabricated float.

### Required type behavior

Use an explicit result type rather than an unqualified `float`, conceptually:

```cpp
struct PinVoltage {
  float v;
  ConversionStatus status; // e.g. CALIBRATED / PENDING / INVALID
};
```

Exact names may differ, but the semantic requirement is fixed:

**PENDING conversion must be impossible to confuse with a valid 0.0V measurement.**

### Naming/domain rule

Names must expose voltage domain where ambiguity exists:

- `*NodeV` for ADS/node domain
- `*PinV` or equivalent for engineering/pin domain

Ambiguous voltage fields must be renamed as part of the domain correction.

### Golden-value regression tests

Use the frozen calibration source points already documented:

- 0V
- 3V
- 12V
- 18V
- 24V
- 30V

Create host-side golden-value tests per measurement family once each family's bench authority is known.

### Acceptance criteria

- Raw/node service remains unchanged in responsibility.
- Invalid/PENDING conversion cannot silently flow into classification.
- Golden-value tests pass.
- `pio run` passes.

---

## Package 4 — Calibration Payload Integration

### Critical boundary
`CalibrationStore` must remain an opaque persistence/integrity layer.

Do NOT move interpretation or engineering conversion logic into `CalibrationStore`.

### Required behavior

The new conversion/calibration layer must:

1. Load the calibration payload through `CalibrationStore`.
2. Validate the payload schema/version expected by the conversion layer.
3. Validate hardware revision / calibration generation inside the payload schema.
4. Apply only verified coefficients/parameters.
5. Expose calibration availability/status to the diagnostic engine.

### Hardware-generation rule

Storage-slot generation and CRC are persistence-integrity mechanisms, not hardware-revision compatibility.

Hardware revision / calibration generation belongs inside the calibration payload schema.

---

## Package 5 — TestEngine Pin-Domain Enforcement

### Objective
Make all diagnostic voltage comparisons operate only in pin/engineering-voltage domain.

### All five voltage fields must be covered

- `continuityMinV`
- `continuityMaxV`
- `openMaxDeltaV`
- `crossResponseDeltaV`
- `externalEnergyDetectV`

The values themselves are not assumed wrong; the current bug is that node-domain measurements are compared against pin-domain thresholds.

### Required changes

1. Route classification inputs through the conversion layer.
2. Reject/PENDING any classification that lacks valid conversion authority.
3. Rename ambiguous result fields to expose domain.
4. Update WebSocket/report persistence fields in the same package so stored/live data semantics match the corrected domain.
5. Preserve raw evidence separately where required for later re-evaluation.

### Cross-scan note
Current `crossResponseDeltaV` is also affected by the same unit-domain bug. Repair the domain path before changing classification thresholds.

### Acceptance criteria

- No TestEngine pin-domain threshold receives raw/node voltage.
- All five voltage fields are covered by tests.
- WS/storage semantics match the corrected engineering-domain contract.
- `pio run` and regression tests pass.

---

## Package 6 — MASTER NET MAP Authority Restoration

Restore the original:

`BREMSECU_G1_V2_MASTER_NET_MAP_v1.3`

into the repository authority chain.

### Requirements

1. Preserve the original content; do not silently reinterpret it during import.
2. Resolve existing references such as `§5` and `§12` so they point to real sections in the restored authority.
3. Document the authority chain:

`REV-2 schematic -> MASTER NET MAP -> derived engineering maps/docs -> firmware mapping`

4. Do not modify schematic-verified mapping while performing this restoration.

---

## Package 7 — Safety Confirmation Lifecycle

### Current state
Successful starts already consume confirmation once. Do not re-implement this unnecessarily.

### Required fixes

1. Add mode binding.
2. Add TTL / expiration.
3. Clear/consume confirmation on failed start attempts as defined by the final state-machine contract.
4. Remove stale-confirmation behavior.
5. Fix explicit revocation semantics: an explicit `false` must not be overridden by stale stored `true` state.
6. Ensure a confirmation for one termination mode cannot authorize another mode.

### Acceptance criteria

Tests must cover:

- valid same-mode confirmation
- expired confirmation
- wrong-mode confirmation
- failed-start cleanup
- explicit revocation
- successful single-use consumption

---

## Package 8 — Load-Test Safety

Separate package. Do not mix with conversion changes.

### Required scope

- external-energy prescan before applying 24V load
- valid INA226 calibration before current-based decisions
- overcurrent cutoff
- watchdog/failsafe timeout
- deterministic fault-safe output shutdown
- preserved evidence for fault/abort duration where relevant

### Hard rule
No INA226 current threshold may be frozen before actual shunt value and current calibration are bench verified.

---

## Package 9 — Diagnostic Classification Expansion

Do this only after measurement topology and conversion are verified.

Re-evaluate whether:

- PASS
- OPEN
- INDETERMINATE

is sufficient.

Potential future classifications include:

- OPEN
- SHORT_TO_GND
- SHORT_TO_POWER
- HIGH_RESISTANCE
- PASS

Do not introduce these merely by naming; each classification must correspond to a physically distinguishable measurement signature.

---

## Package 10 — Production Hardening

After critical measurement/safety packages are closed, address separately:

- AP authentication
- API authentication/session model
- JSON parsing robustness
- request-size limits/timeouts
- SD error semantics
- automatic result persistence/journaling
- schema migration
- WebSocket resynchronization
- PWA dependency version pinning + lockfile
- any remaining platform/dependency reproducibility issues

These changes must not be bundled into earlier critical measurement commits unless required by a proven dependency.

---

# REVIEW / MERGE GATES

Every package follows this sequence:

1. Authority/spec update where needed.
2. Qwen implementation only for that package.
3. Deterministic build/test.
4. Independent adversarial review by the third reviewer.
5. Fix review findings.
6. Reviewer PASS.
7. Merge.
8. Move to next package.

No package is considered complete merely because code exists.

Possible statuses are intentionally separated:

- SPEC PASS
- BUILD PASS
- STATIC REVIEW PASS
- AUTOMATED TEST PASS
- BENCH PASS
- SAFETY VALIDATION PASS
- MERGE PASS

A bare `PASS` must not be used when only one of these has been verified.

---

# REVIEW REQUEST FOR THIS FILE

Independent reviewer: please inspect **this exact file in Git** and compare it against your previous `APPROVE WITH CHANGES` review.

Do not modify the repository.

Return one of:

- **PLAN PASS** — this file faithfully captures the approved remediation architecture and ordering.
- **PLAN PASS WITH CHANGES** — list exact sections that still need correction and why.
- **PLAN REJECT** — explain the architectural conflict and proposed alternative.

Also explicitly confirm whether the following three ordering constraints are correct:

1. Build gate before functional remediation.
2. Interlock field-update + required bench verification before activating conversion/calibration in TestEngine.
3. Conversion/calibration correctness before diagnostic-classification expansion.
