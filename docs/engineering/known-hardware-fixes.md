# Known REV-2 Prototype Hardware Fixes

## TQ relay orientation
K2-K5 use polarized TQ-series relay coils. Prototype units required 180-degree relay mounting to match coil polarity. Final PCB/schematic must correct the footprint/orientation so production relays mount normally.

## microSD module supply
The tested microSD reader module includes an onboard regulator/level interface and did not operate correctly when its module VCC input was fed from 3.3V. The regulator output fell to about 2.4V. Prototype fix: cut the 3.3V feed and supply the module from 5V. After this, exFAT mount/write/read passed.

Final design rule: power the selected SD implementation according to its actual module/socket topology; do not blindly copy the prototype jumper.

## No respin requirement for bring-up
These are documented final-board corrections. The working prototype may continue to be used for firmware and diagnostic characterization.