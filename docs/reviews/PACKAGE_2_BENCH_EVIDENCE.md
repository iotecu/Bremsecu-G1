# BREMSECU G1 REV-2 — Package 2 Bench Evidence

Status: BENCH PENDING
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md` — Package 2
Baseline: Package 1 commit `e8e4162e991e9b5924c3c56d109122addd891bd2`

## Hard rules

- No conversion coefficient, shunt value, relay-state assumption, threshold margin, or CAN `_R` model may be inferred.
- Record only directly observed bench evidence.
- Do not change firmware behavior in Package 2.
- Any unresolved item remains explicitly `PENDING`.

---

## 2.1 K1 default contact state

Condition: K1 de-energized.

Record direct continuity / resistance evidence for both paths.

| Path | Observed result | Instrument / note |
| --- | --- | --- |
| `SELECT_V <-> 3.3V` | PENDING | |
| `SELECT_V <-> 24V` | PENDING | |

Design intent stated in remediation plan: de-energized = 3.3V, energized = 24V.

Verdict: PENDING

---

## 2.2 ISO7638 GND1 / GND2 transfer behavior

Determine the real transfer behavior for:

- `7P_GND1`
- `7P_GND2`

Do not assume the normal 100k/10k vehicle-voltage divider model.

### `7P_GND1`

| Applied pin condition / voltage | Measured node voltage / ADC evidence | Note |
| --- | --- | --- |
| PENDING | PENDING | |
| PENDING | PENDING | |
| PENDING | PENDING | |

Observed transfer relation: PENDING

### `7P_GND2`

| Applied pin condition / voltage | Measured node voltage / ADC evidence | Note |
| --- | --- | --- |
| PENDING | PENDING | |
| PENDING | PENDING | |
| PENDING | PENDING | |

Observed transfer relation: PENDING

Verdict: PENDING

---

## 2.3 INA226 shunt

Read or measure the actual shunt used by the installed INA226 module.

| Item | Observed value | Evidence / marking / method |
| --- | --- | --- |
| Shunt resistance | PENDING | |

No current conversion constant is authorized until this value is bench-verified.

Verdict: PENDING

---

## 2.4 MASTER_GND / K6 return path

Answer from direct bench observation only.

| Question | Observed answer | Evidence / note |
| --- | --- | --- |
| Is K6 required during cable test? | PENDING | |
| Is K6 required during each calibration family? | PENDING | |
| What happens electrically when K6 is open? | PENDING | |

Verdict: PENDING

---

## 2.5 CD40106 threshold margin

Bench / scope verification at minimum the following source voltages.

| Source voltage | Schmitt input node voltage | Digital output behavior | Scope / note |
| ---: | ---: | --- | --- |
| 22 V | PENDING | PENDING | |
| 24 V | PENDING | PENDING | |
| 28 V | PENDING | PENDING | |

Verdict: PENDING

---

## 2.6 CAN `_R` state dependency

Determine from bench evidence whether `_R` conversion requires relay-state input or whether a differential / delta method can cancel relay-contact effects.

| Relay / termination state | Applied CAN condition | Measured `_R` evidence | Note |
| --- | --- | --- | --- |
| PENDING | PENDING | PENDING | |
| PENDING | PENDING | PENDING | |

Observed relay-state dependency: PENDING

Authorized conversion approach: PENDING

Verdict: PENDING

---

## Package 2 gate

Package 2 may be marked `BENCH PASS` only when all six sections above contain direct evidence and no required engineering value remains inferred.

Current status: **BENCH PENDING**
