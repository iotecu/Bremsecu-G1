# Bremsecu G1 Safety Rules

These rules are implementation constraints, not optional UI preferences.

## Single active output

- At most one controllable test output may be active within a test group.
- When switching outputs, the currently active output must be turned OFF before a new output is turned ON.
- The firmware must enforce this independently of the PWA.
- The firmware must reject unsafe simultaneous-output states even if requested by the frontend.

## CAN termination test interlock

Before any CAN termination measurement relay is energized:

1. Scan the relevant ISO 7638 or ISO 12098 voltage channels.
2. If battery, ignition or any unexpected external energy is detected, abort the termination test.
3. Show a warning equivalent to: `Kontak acik / hatta enerji var, terminasyon testi baslatilamaz.`
4. Do not energize the CAN termination DPDT relays while the line is energized.
5. Only after all relevant lines are confirmed de-energized may the relays move to the termination-measurement position.

## Service/master mode

- Service/master authorization must never disable safety-critical firmware interlocks.
- Safety rules always override UI and authorization state.

## General firmware boundary

Any safety-critical condition must be enforced locally by the ESP firmware so loss of connectivity, UI bugs, stale state, or malformed commands cannot create an unsafe output state.
