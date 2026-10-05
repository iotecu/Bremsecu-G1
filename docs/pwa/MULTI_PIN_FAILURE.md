# Voltage pin-failure overlay — approved extension, 2026-10-05

The user approved implementing this overlay directly in the existing G1/G2 UI, without a new Figma screen. This approval extends the 40-screen baseline; it does not change the main carousel or add a route.

## Behavior

- Applies to ISO 7638 and ISO 12098 voltage measurement screens.
- Requires a live telemetry connection, an active pin for the same voltage mode, and at least one other pin classified as final `FAIL` by firmware.
- Displays the active measurement context and every currently failed pin with its translated function name and available measurement.
- One failed background pin uses the additional-failure title; multiple failures use the multiple-pin title.
- `Continue Checking` acknowledges the current faults without stopping or changing the hardware test.
- `Inspect Failures` closes the overlay, focuses the existing channel table, and highlights the failed rows. It does not issue a hardware command or open another route.
- A summary control allows reviewing the faults again.
- Repeated samples and active-pin movement do not reopen acknowledged faults. A newly failed pin, or a recovered pin failing again, can reopen the overlay.
- New tests reset acknowledgements. Disconnection clears voltage samples and active context, preventing stale failures from resurfacing after reconnect. Stopping a test clears active context.
- Keyboard focus stays in the modal; Escape acknowledges and returns to measurement. Labels ship in all 14 existing locales, including RTL.

## Classification boundary

`valid: true` means a measurement is usable, not that the pin passed. Final PASS/FAIL requires an explicit firmware `status` and `classificationFinal: true`. Invalid readings and pending classifications never trigger this overlay. No thresholds or cross-channel short-circuit inference are implemented in the PWA.

The current repository firmware emits `classificationFinal: false` for voltage measurements. Therefore real-device automatic FAIL activation remains blocked until engineering thresholds are frozen and firmware publishes authoritative classifications. Browser and automated verification use isolated contract-shaped test data; no production mock fallback was added.

## Verification

`npm run build` runs locale parity, automated tests, TypeScript, production bundling, service-worker generation and static ESP32 package validation. Added tests cover both sockets, provisional classifications, multiple faults, acknowledgement, inspection focus, keyboard behavior, recovery, restart and reconnection.

## Remaining final gates

- Bench calibration/threshold approval and authoritative voltage classification from firmware.
- Real ESP32 HTTP/WebSocket end-to-end tests for both voltage modes and pin sequencing.
- Physical lamp, cable and de-energized termination checks.
- Device-backed result saving/report generation and settings/calibration verification.
- Installed offline tablet run through the full service-record/test/report journey.

Passing the software build does not close these hardware and field gates.
