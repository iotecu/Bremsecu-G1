# Known REV-2 Prototype Hardware Fixes

## TQ relay orientation
K2-K5 use polarized TQ-series relay coils. Prototype units required 180-degree relay mounting to match coil polarity. Final PCB/schematic must correct the footprint/orientation so production relays mount normally.

## microSD module supply
The tested microSD reader module includes an onboard regulator/level interface and did not operate correctly when its module VCC input was fed from 3.3V. The regulator output fell to about 2.4V. Prototype fix: cut the 3.3V feed and supply the module from 5V. After this, exFAT mount/write/read passed.

Final design rule: power the selected SD implementation according to its actual module/socket topology; do not blindly copy the prototype jumper.

## CD40106 pulse-path note — earlier failure classification withdrawn
A Package 2 static partial-state check recorded these observations on the SAG path:

- 22V bench input: U9 pin 1 = 1.49V, U9 pin 2 = 3.28V
- 24V bench input: U9 pin 1 = 1.54V, U9 pin 2 = 3.28V
- 28V bench input: U9 pin 1 = 1.64V, U9 pin 2 = 3.28V

These values were captured while the complete card/ESP pulse workflow was not operating in its intended functional state and without a valid end-to-end HIGH/LOW pulse test. They therefore do **not** establish a CD40106 hardware defect or insufficient switching margin.

The earlier hardware-failure classification is withdrawn. Do not use these static values as a production PASS/FAIL verdict.

Correct closure test: once the card is operational, drive the intended pulse input through a controlled HIGH/LOW cycle (historically 400ms cadence or equivalent) and verify U9 inversion plus GPIO36/GPIO39 detection end-to-end. Only then characterize analog margin further if needed.

## No blanket respin requirement for characterization
The documented prototype findings do not invalidate unrelated firmware/diagnostic characterization. Use the working prototype for unaffected tests while each known hardware finding is isolated and resolved.
