# Package 6 — MASTER NET MAP Authority Restoration Evidence

Status: REVIEW GATE

## Restored source

`docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`

Package 6 restores the previously frozen G1-V2 authority into the repository. It does not intentionally revise hardware identity.

## Authority chain

`REV-2 schematic -> MASTER NET MAP v1.3 -> derived engineering maps/docs -> firmware identity maps -> runtime behavior`

Repository architecture and `docs/authority/README.md` now state this order explicitly.

## Cross-check coverage

`tools/check_master_net_map.py` verifies repository consistency for:

- ESP32 GPIO/net assignments used by `pins.h`
- TPIC relay/output bit positions used by `tpic_map.h`
- TPIC serial-chain facts including U6 SER IN=`TPIC_SER`, RCK=`TPIC_RCK`, SRCK=`TPIC_CLK`
- full 4x8 ADC/MUX matrix including NC locations
- derived TPIC output/control documentation
- firmware authority citation and compile-time mapping guards
- repository authority-chain declaration

The script is a consistency gate, not a substitute for the original schematic review or accepted physical bring-up evidence.

## Mapping comparison result

Current derived maps and firmware identities inspected on this branch agree with restored v1.3 for the checked frozen identities:

- GPIO/net map: MATCH
- ADC/MUX matrix: MATCH
- TPIC OUT1..OUT22 grouping: MATCH
- U6 K1..K6 control mapping: MATCH
- pulse GPIO mapping: MATCH
- TPIC chain direction: MATCH

No hardware mapping was changed to satisfy Package 6.

## Acceptance gate

Package 6 is accepted only when the branch workflow passes all of the following on the final branch head:

1. MASTER NET MAP authority consistency check
2. ESP32 firmware build
3. Package 1 interlock regression
4. Package 3 measurement conversion regression
5. Package 4 calibration payload regression
6. Package 5 pin-domain regression

Do not advance this package as sealed from a documentation-only review if the final CI head is red.
