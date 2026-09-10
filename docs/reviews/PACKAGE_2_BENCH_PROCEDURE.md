# BREMSECU G1 REV-2 — Package 2 Bench Procedure

Status: TWO TARGETED PHYSICAL CHECKS REMAIN
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Evidence record: `docs/reviews/PACKAGE_2_BENCH_EVIDENCE.md`
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`

## Evidence reuse rule

Do not repeat accepted REV-2 measurements.

Already closed/reused:

- K1 OFF = 3.3V, K1 ON = 24V.
- MASTER_GND/K6 topology and open-vs-grounded GND-sense behavior.
- MASTER_GND-referenced calibration dataset at 0/3/12/18/24/30V.
- Cable-test K6 policy = OFF.
- INA226 installed shunt marking = R010 = nominal 10 mOhm.

Package 2 now needs only the two physical facts below.

---

# A. CD40106 threshold-margin check

Parent-plan requirement: verify at minimum 22V, 24V and 28V and record the Schmitt input-node voltage plus digital output behavior.

Frozen path:

- 15P_SAG_SINYAL -> U9 pin 1 (1A) -> U9 pin 2 (1Y) -> SAG_PULS / GPIO36.
- 15P_SOL_SINYAL -> U9 pin 3 (2A) -> U9 pin 4 (2Y) -> SOL_PULS / GPIO39.
- U9 supply = 3.3V.

Schematic source scaling on these signal paths is 100k/10k, so the ideal node estimates are only a cross-check:

| Applied signal | Ideal 1/11 node estimate |
| ---: | ---: |
| 22.00V | 2.000V |
| 24.00V | 2.182V |
| 28.00V | 2.545V |

These estimates are NOT accepted bench values.

## Minimum physical capture

Use the SAG path as the full characterization path unless physical inspection shows it differs from the SOL path.

For each source setting 22V, 24V and 28V:

1. Apply the source to the 15P SAG signal input with the normal board ground/reference used for voltage testing.
2. Measure U9 pin 1 relative to board GND.
3. Measure U9 pin 2 relative to board GND.
4. Record whether pin 2 is stable HIGH, stable LOW, or unstable/toggling.

Then perform one symmetry spot-check on the SOL path at 24V:

- U9 pin 3 voltage.
- U9 pin 4 voltage/state.

Required evidence table:

| Path | Applied input | U9 input node | U9 output | State |
| --- | ---: | ---: | ---: | --- |
| SAG 1A/1Y | 22V | PENDING | PENDING | PENDING |
| SAG 1A/1Y | 24V | PENDING | PENDING | PENDING |
| SAG 1A/1Y | 28V | PENDING | PENDING | PENDING |
| SOL 2A/2Y | 24V | PENDING | PENDING | PENDING |

Do not derive a production threshold until these physical values are reviewed.

---

# B. CAN `_R` relay-state / delta check

Parent-plan requirement: determine whether `_R` conversion needs relay-state knowledge or whether termination diagnosis can use a differential/delta model.

Frozen reference network:

- 3.3V -> 1.5k -> selected CAN-H `_R` node.
- selected CAN-L `_R` node -> 1.5k -> GND.
- ISO7638 `_R`: CANH_1_R / CANL_1_R.
- ISO12098 `_R`: CANH_2_R / CANL_2_R.

Theoretical values below are only a wiring sanity check, not bench authority. With an ideal 3.3V rail, ideal 1.5k reference resistors and a 120 ohm resistor between H/L, the series-current model predicts approximately:

- CANH_R ≈ 1.713V
- CANL_R ≈ 1.587V
- H-L delta ≈ 0.127V

For a general bus resistance `Rbus`, ideal delta relation is:

`delta = Vs * Rbus / (2*Rref + Rbus)`

and therefore:

`Rbus = 2*Rref*delta / (Vs - delta)`

This relation is not production-authorized until the relay/path effect is physically checked.

## Minimum physical capture — ISO7638

Use a known 120 ohm resistor directly across the selected ISO7638 CAN-H/CAN-L test pair. External CAN electronics must be unpowered.

Record:

1. All CAN relays OFF: CANH_1_R and CANL_1_R.
2. K2 / ISO7638 CK selected: CANH_1_R and CANL_1_R.
3. Return all CAN relays OFF.
4. Put the same 120 ohm resistor on the ISO7638 DR pair.
5. K4 / ISO7638 DR selected: CANH_1_R and CANL_1_R.
6. Return all CAN relays OFF.

Evidence table:

| State | Known load | CANH_1_R | CANL_1_R | Delta H-L |
| --- | --- | ---: | ---: | ---: |
| all CAN relays OFF | 120 ohm on disconnected side | PENDING | PENDING | PENDING |
| K2 / CK | 120 ohm | PENDING | PENDING | PENDING |
| K4 / DR | same 120 ohm | PENDING | PENDING | PENDING |

Decision rule after capture:

- If K2 and K4 produce materially the same H/L and delta values within measurement repeatability, the ISO7638 `_R` conversion does not need relay identity merely to compensate selector state; a common delta model can be considered.
- If the selected relay/path creates a meaningful repeatable offset, relay/path state must remain part of conversion authority or be separately compensated.

Only after ISO7638 evidence is reviewed will we decide whether an ISO12098 repeat is necessary. Do not automatically duplicate the test.

---

## Completion rule

Package 2 closes when the two evidence tables above contain real physical observations and the resulting decisions are documented without guessed coefficients.
