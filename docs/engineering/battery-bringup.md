# REV-2 Battery Monitor Theoretical Verification

Status: theoretical design expectation for `feature/battery-monitor-rev2`. Physical bench confirmation is deferred by project decision; this document must not be cited as observed bench evidence.

## Authority under evaluation

- Battery voltage path: 12 V battery -> 100 kΩ / 10 kΩ divider -> U11 Y4 -> ADS1115 AIN3.
- Nominal divider scale: 11.0:1.
- Existing 24 V load INA226: I2C `0x40`.
- Battery INA226: I2C `0x41`.
- Battery INA226 shunt: R010 = 0.010 Ω.
- API endpoint: `GET /api/v1/battery`.

## 1. Expected I2C topology

Expected shared-bus identities:

- `0x40` — existing 24 V load INA226.
- `0x41` — battery INA226.

Firmware config and CI regression verify that the two services are addressed independently. Actual physical coexistence is not claimed by this document.

## 2. Battery divider — nominal expectation

Nominal divider:

`Vnode = Vbattery * 10k / (100k + 10k) = Vbattery / 11`

Firmware reconstructs:

`Vbattery = Vnode * 11`

Representative theoretical values:

| Battery input | Expected divider node |
|---:|---:|
| 12.0 V | 1.0909 V |
| 12.8 V | 1.1636 V |
| 13.2 V | 1.2000 V |
| 13.6 V | 1.2364 V |
| 14.4 V | 1.3091 V |
| 14.6 V | 1.3273 V |

Assuming both 100 kΩ and 10 kΩ divider resistors are 0.1% tolerance, worst-case divider scale is approximately 10.9800:1 to 11.0200:1. That is approximately +/-0.182% scale error from resistor tolerance alone before ADC/reference/layout errors.

Example at 12.8 V: resistor-tolerance-only worst-case reconstructed error is approximately +/-0.023 V.

No tighter production accuracy claim is authorized until final calibration/bench characterization exists.

## 3. Battery current — theoretical expectation

With R010 = 0.010 Ω:

`Vshunt = I * 0.010 Ω`

Representative values:

| Battery current | Expected shunt voltage |
|---:|---:|
| 0.5 A | 5 mV |
| 1.0 A | 10 mV |
| 2.0 A | 20 mV |
| 5.0 A | 50 mV |
| 8.0 A | 80 mV |

INA226 shunt-voltage full scale is approximately +/-81.92 mV. With a 10 mΩ shunt, the theoretical measurable current range is therefore approximately +/-8.192 A.

Firmware rejects a saturated shunt register as invalid evidence instead of publishing a clipped current as a valid value.

Important: `R010` identifies the nominal resistance value only. The shunt resistor tolerance is not established by the marking itself, so current-accuracy tolerance is not claimed here.

## 4. API expected behavior

`GET /api/v1/battery` exposes:

- `voltageV`
- `voltageValid`
- `currentA`
- `currentValid`
- `powerW`
- `powerValid`
- `inaBusVoltageV`
- `inaBusVoltageValid`
- `shuntVoltageV`
- `shuntVoltageValid`
- `error`

Expected rules:

- `powerW = voltageV * currentA` only when both source values are valid.
- Missing ADC or INA evidence is represented by its validity flag and `null`, not by a fabricated valid zero.
- Saturated battery-current evidence is invalid/fail-closed.
- No SOC percentage, low-battery threshold, charge-state classification or battery-health judgement is generated.

## 5. Current project disposition

For the present REV-2 development stage, the battery-monitor design is accepted on the basis of:

- approved hardware topology,
- nominal component values,
- 0.1% divider resistor intent,
- INA226/R010 transfer relationship,
- firmware authority guards,
- native regression coverage,
- successful full firmware CI.

This is a theoretical/design acceptance, not a statement that the new battery path has already been physically measured on the prototype.
