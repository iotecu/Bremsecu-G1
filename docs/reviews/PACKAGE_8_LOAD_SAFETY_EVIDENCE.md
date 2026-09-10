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

Integrated TestEngine load-safety commit: `56970b6e95159a96aff1dfcf9f8180cde6e77801`.

WebSocket/storage load-evidence integration commit: `8692896597df6e23147c50add896cde41506952b`. Live evidence now exposes the overcurrent fault reason plus peak current, sample count, overcurrent/timed-out state and energized duration; completed load-result serialization preserves the same safety evidence.

## Threshold policy

`TestEngineConfig::loadOvercurrentMaxA` defaults to `0.0f` deliberately.

Zero does **not** mean unlimited current. It means production overcurrent authority is absent, therefore load tests are rejected before 24V can be applied.

No guessed current threshold is frozen by Package 8.

## INA226 evidence audit

The current repository authority and recovered project material identify the INA226 topology and positive-current path, but do not establish the resistance of the physically installed REV-2 shunt.

The restored MASTER NET MAP identifies MDL1 as a CJMCU-226-style module and establishes `24V_SOURCE -> IN+ -> SHUNT -> IN- -> load side`, but does not state the shunt resistance.

The recovered INA226 service authority explicitly leaves Calibration/current conversion PENDING bench characterization and exposes current only after `applyCalibration()` succeeds.

A recovered generic/product image of a CJMCU-style module shows a resistor marking, but it is not provenance for the physically installed Bremsecu REV-2 board and is therefore not accepted as production calibration authority.

A second search of the File Library plus prior-conversation context found no authoritative record of the physically installed shunt value or a completed production current calibration. This is therefore treated as a genuinely missing physical fact, not a request to repeat an already accepted measurement.

## Remaining physical authority

Package 8 cannot be SEALED until the physically installed INA226 module provides authoritative current-calibration input, specifically:

- installed shunt resistance/marking (or equivalent authoritative module identification), and
- resulting verified current calibration / safe overcurrent limit.

Until that authority exists, the software remains fail-closed for lamp and axle-lift load modes.

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

The first full CI run with the Package 8 gate (`34503250115`) passed the authority check, ESP32 build and all Package 1/3/4/5/7/8 regressions. A final branch-head CI run is required after telemetry/storage integration.

## Package state

Do not mark Package 8 SEALED merely because CI is green. Green CI proves the software safety behavior; final package closure still requires the single missing physical current-calibration authority described above.
