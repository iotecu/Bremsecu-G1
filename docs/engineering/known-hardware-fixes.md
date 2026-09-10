# Known REV-2 Prototype Hardware Fixes

## TQ relay orientation
K2-K5 use polarized TQ-series relay coils. Prototype units required 180-degree relay mounting to match coil polarity. Final PCB/schematic must correct the footprint/orientation so production relays mount normally.

## microSD module supply
The tested microSD reader module includes an onboard regulator/level interface and did not operate correctly when its module VCC input was fed from 3.3V. The regulator output fell to about 2.4V. Prototype fix: cut the 3.3V feed and supply the module from 5V. After this, exFAT mount/write/read passed.

Final design rule: power the selected SD implementation according to its actual module/socket topology; do not blindly copy the prototype jumper.

## CD40106 24V pulse-input operating-range finding
Package 2 direct bench characterization of the `15P_SAG_SINYAL -> U9 1A -> U9 1Y / SAG_PULS` path produced:

- 22V external input: U9 pin 1 = 1.49V, U9 pin 2 = 3.28V
- 24V external input: U9 pin 1 = 1.54V, U9 pin 2 = 3.28V
- 28V external input: U9 pin 1 = 1.64V, U9 pin 2 = 3.28V

No inverter output transition was observed across 22-28V. The measurement therefore demonstrates insufficient switching behavior/margin in the present built path for the intended positive vehicle-side signal range.

Root cause and component-value correction are **not yet frozen**. Do not guess a replacement divider or threshold value. The path must be electrically reviewed, corrected if required, and re-verified before REV-2 hardware closure.

## No blanket respin requirement for characterization
The documented prototype findings do not invalidate unrelated firmware/diagnostic characterization. Use the working prototype for unaffected tests while each known hardware finding is isolated and resolved.
