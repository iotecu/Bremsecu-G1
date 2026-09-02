# BREMSECU G1 REV-2 — Engineering API Contract

Status: ENGINEERING TRANSPORT CONTRACT.

This file defines engineering-specific live telemetry/payload semantics. General HTTP resources remain documented in `../API_CONTRACT.md`.

## Cable-test WebSocket event

Event type:

```json
{
  "type": "cable_test_progress",
  "socket": "12098",
  "currentPin": 8,
  "currentPinName": "GERI_VITES",
  "focusVoltage": 3.2,
  "continuity": "PASS",
  "shorts": [
    {"from": 8, "to": 7, "delta": 2.1}
  ],
  "progress": {
    "completed": 8,
    "total": 15
  },
  "classificationFinal": false
}
```

## Field semantics

- `type`: fixed event name `cable_test_progress`.
- `socket`: active cable-test socket/context, e.g. `7638` or `12098`.
- `currentPin`: focus pin currently being tested.
- `currentPinName`: stable machine/i18n key or approved function identifier; PWA localizes display text.
- `focusVoltage`: measured engineering value of the expected focus return.
- `continuity`: continuity classification for the focus pin (`PASS`, `OPEN`, `INDETERMINATE`).
- `shorts`: cross-response candidates detected while the focus pin is energized.
- `shorts[].from`: focus source pin.
- `shorts[].to`: coupled/miswire candidate pin or mapped connector pin.
- `shorts[].delta`: measured response delta versus that channel's own baseline.
- `progress.completed`: number of enabled focus pins already processed or current sequential position, according to one implementation convention chosen and documented by firmware.
- `progress.total`: total enabled focus pins in this test run.
- `classificationFinal`: false whenever required production thresholds remain PENDING.

Do not encode progress as the JSON expression `8/15`; JSON must carry explicit numeric fields.

## Optional evidence fields

Firmware may additionally publish:

```json
{
  "focusBaseline": 0.01,
  "crossSamples": [
    {
      "channelId": "15P_STOP",
      "pin": 7,
      "baseline": 0.04,
      "measured": 2.14,
      "delta": 2.10,
      "isCoupled": true
    }
  ]
}
```

These fields are useful for service evidence/debugging and must preserve the distinction between raw/baseline measurements and interpreted classifications.

## Lifecycle events

Recommended cable-test event sequence:

1. `test_started`
2. `cable_test_baseline_ready`
3. repeated `cable_test_progress`
4. `cable_test_completed`
5. optional `record_updated` after explicit save-to-report action

Example completion payload:

```json
{
  "type": "cable_test_completed",
  "socket": "12098",
  "testedPins": 15,
  "passCount": 12,
  "openCount": 2,
  "indeterminateCount": 0,
  "shortCount": 1,
  "shorts": [
    {"from": 8, "to": 7, "delta": 2.1}
  ],
  "classificationFinal": false
}
```

## Safety boundary

The PWA cannot use WebSocket or HTTP to directly energize arbitrary outputs. It submits approved test intent and enabled-pin selection; firmware owns:
- K1 OFF enforcement,
- one-focus-pin-only enforcement,
- baseline acquisition,
- output sequencing,
- ADC scan sequencing,
- fail-safe cleanup on stop/fault/disconnect where applicable.

## Authority references

- `CABLE_TEST_ENGINE.md`
- `TEST_SPECS.md`
- `tpic-output-map.md`
- `adc-mux-map.md`
- `safety-interlocks.md`
