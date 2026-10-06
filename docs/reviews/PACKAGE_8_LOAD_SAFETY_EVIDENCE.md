# Package 8 — Load-Test Safety Evidence

Status: SOFTWARE PASS / FINAL CURRENT CHARACTERIZATION DEFERRED TO INTEGRATED BENCH

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

Integrated TestEngine load-safety commit: `56970b6e95159a96aff1dfcf9f8180cde6e77801`.

WebSocket/storage load-evidence integration commit: `8692896597df6e23147c50add896cde41506952b`.

## INA226 shunt authority

The physically installed/planned REV-2 INA226 shunt marking was confirmed by the operator during Package 2 as **R010**.

`R010` corresponds to nominal **0.010 ohm / 10 milliohm**.

That component identity is accepted and must not be requested again merely to satisfy Package 8.

## Threshold policy

`TestEngineConfig::loadOvercurrentMaxA` defaults to `0.0f` deliberately.

Zero does **not** mean unlimited current. It means production overcurrent authority is absent, therefore load tests are rejected before 24V can be applied.

The remediation plan explicitly forbids freezing a current threshold before actual current calibration / load characterization. Therefore Package 8 does not invent a lamp or axle-lift overcurrent number from the nominal 10 mOhm shunt alone.

## Final integrated bench item

The only remaining load-current item is normal final-system characterization when the full card is operating with real load hardware:

- verify INA226 current conversion against known/observed load current;
- freeze the production overcurrent limit from real lamp/axle behavior;
- confirm timeout and overcurrent shutdown end-to-end.

This is part of final integrated card validation, not a reason to stop firmware remediation or repeat already accepted component/board bring-up work now.

Until that final characterization is frozen, load modes remain software fail-closed because `loadOvercurrentMaxA` has no production value.

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

CI run `34503673974` passed the MASTER NET MAP authority check, ESP32 firmware build, and Package 1/3/4/5/7/8 regression gates.

## Package state

Package 8 software remediation is complete for the current development stage. The package is not falsely labelled FINAL BENCH PASS; production current threshold characterization remains explicitly deferred to the final integrated motherboard test.
