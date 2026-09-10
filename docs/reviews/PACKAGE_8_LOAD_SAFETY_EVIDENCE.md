# Package 8 — Load-Test Safety Evidence

Status: SOFTWARE FAIL-CLOSED; BENCH AUTHORITY PENDING

## Safety defects addressed

The pre-Package-8 TestEngine entered the load branch before the common external-energy pre-scan and could call `applyLoadOutput()` immediately. It also sampled INA226 once and then waited for the maximum-on timer, so there was no continuous overcurrent supervision.

Package 8 changes the contract so 24V load output is unreachable unless all safety authority is present and the external-energy pre-scan has completed.

## Implemented safety contract

Before any lamp or axle-lift 24V output:

1. mode/pin/axle preconditions are validated;
2. INA226 current calibration must already be applied;
3. a positive finite overcurrent limit must be explicitly configured;
4. every relevant connector pin is scanned in calibrated pin-voltage domain for unexpected external energy;
5. only after all above pass may `applyLoadOutput()` energize the selected load.

During the energized load:

- the hard max-on timer is checked before each sensor transaction;
- INA226 is sampled repeatedly at the configured watchdog cadence;
- shunt, bus and calibrated current evidence must remain valid;
- current above the configured limit immediately causes fault-safe output shutdown;
- invalid current evidence fails closed;
- peak current, sample count, overcurrent flag and energized duration are preserved;
- fault/stop preserves `onMs` before forcing all outputs off.

## Threshold policy

`TestEngineConfig::loadOvercurrentMaxA` defaults to `0.0f` deliberately.

Zero does **not** mean unlimited current. It means production overcurrent authority is absent, therefore load tests are rejected before 24V can be applied.

No guessed current threshold is frozen by Package 8.

## INA226 evidence audit

The current repository authority and recovered project material identify the INA226 topology and positive-current path, but do not establish the resistance of the physically installed REV-2 shunt.

A recovered generic/product image of a CJMCU-style module shows a resistor marking, but it is not provenance for the physically installed Bremsecu REV-2 board and is therefore not accepted as production calibration authority.

Existing INA226 firmware correctly keeps current conversion calibration-gated.

## Remaining physical authority

Package 8 cannot be SEALED until the physically installed INA226 module provides authoritative current-calibration input, specifically:

- installed shunt resistance/marking (or equivalent authoritative module identification), and
- resulting verified current calibration / safe overcurrent limit.

Until that authority exists, the software must remain fail-closed for lamp and axle-lift load modes.

## Regression scope

`native-load-safety` covers:

- calibration authority required
- overcurrent limit authority required
- valid authority acceptance
- at-limit current safe
- above-limit current trip
- invalid current evidence rejection
- inclusive timeout boundary
- millis wraparound
- zero timeout immediate fail-safe

## Package state

Do not mark Package 8 SEALED merely because CI is green. Green CI proves the software safety behavior; final package closure still requires the single missing physical current-calibration authority described above.
