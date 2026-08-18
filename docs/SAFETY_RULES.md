# Bremsecu G1 Safety Rules

These rules are implementation constraints, not optional UI preferences.

## Single active output

- At most one controllable test output may be active within a test group.
- When switching outputs, the currently active output must be turned OFF before a new output is turned ON.
- The firmware must enforce this independently of the PWA.
- The firmware must reject unsafe simultaneous-output states even if requested by the frontend.
- The PWA must not display an output as active until firmware confirms the requested state.

## ISO 12098 conditional PIN10-PIN12 confirmation

PIN10, PIN11 and PIN12 are conditional vehicle/trailer functions.

- Absence of the related function must not automatically become FAIL.
- Each pin requires its own confirmation modal before its measurement request begins.
- `FONKSIYON YOK` keeps the output/measurement inactive and excludes that item from customer-facing reporting.
- `ONAYLA VE BASLAT` authorizes the PWA to request that pin measurement immediately; the row toggle becomes active automatically after the modal closes.
- PIN11 UI wording must stay generic enough to avoid claiming a vehicle-specific subfunction that has not been confirmed.
- PIN12 confirmation must include the approved operating-condition warning shown in Figma.

This confirmation is an operator workflow rule. It does not replace firmware-side electrical safety checks.

## Lamp-test axle-lift two-step safety interaction

The lamp-test axle-lift command uses a separate, stronger interaction from voltage-test PIN12.

1. First axle-lift toggle request is intercepted by the PWA.
2. No axle-lift output command may be sent at this stage.
3. Dedicated safety confirmation is shown.
4. Technician confirms the required safe operating condition shown in the UI.
5. After confirmation, the PWA returns to the lamp-test screen with the axle-lift toggle still OFF.
6. A second deliberate toggle press is required before the PWA may request axle-lift operation.
7. Cancel, missing confirmation or interrupted flow leaves the output OFF.

The firmware must still enforce its own output-state rules independently of this UI interaction.

## CAN termination test interlock

Before any CAN termination measurement relay is energized:

1. Scan the relevant ISO 7638 or ISO 12098 voltage channels.
2. If battery, ignition or any unexpected external energy is detected, abort the termination test.
3. Show a warning equivalent to: `Kontak açık / hatta enerji var, terminasyon testi başlatılamaz.`
4. Do not energize the CAN termination DPDT relays while the line is energized.
5. Only after all relevant lines are confirmed de-energized may the relays move to the termination-measurement position.

The current product flow treats tractor/trailer sections separately and the UI working reference expects approximately 120 ohm for the section being measured. Implementation must use the verified project measurement topology rather than silently substituting a generic complete-bus 60 ohm rule.

## Service/master mode

- Service/master authorization must never disable safety-critical firmware interlocks.
- Safety rules always override UI and authorization state.

## General firmware boundary

Any safety-critical condition must be enforced locally by the ESP firmware so loss of connectivity, UI bugs, stale state, malformed commands or a restarted browser cannot create an unsafe output state.

The PWA may add confirmations and guardrails, but frontend state is never the final authority for a physical output.