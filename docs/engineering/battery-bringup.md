# REV-2 Battery Monitor Bench Verification

Status: required physical validation for `feature/battery-monitor-rev2` after successful CI.

This procedure validates only the newly added battery-monitor hardware and firmware path. Previously accepted REV-2 bring-up evidence is not repeated.

## Authority under test

- Battery voltage path: 12 V battery -> 100 kΩ / 10 kΩ divider -> U11 Y4 -> ADS1115 AIN3.
- Nominal divider scale: 11.0:1.
- Existing 24 V load INA226: I2C `0x40`.
- Battery INA226: I2C `0x41`.
- Battery INA226 shunt: R010 = 0.010 Ω.
- API endpoint: `GET /api/v1/battery`.

## 1. I2C presence

With the board powered normally, verify the shared I2C bus shows both INA226 devices:

- `0x40` — existing 24 V load INA226.
- `0x41` — battery INA226.

Pass criterion: both addresses are present together, with the previously accepted ADS1115 / RTC devices remaining present.

If `0x41` is missing, stop battery-current validation and correct the INA226 address strapping/wiring before continuing.

## 2. Battery ADC voltage path

Measure battery voltage directly with a trusted multimeter at the battery input and read `/api/v1/battery`.

Record:

- Multimeter battery voltage: `_____ V`
- API `voltageV`: `_____ V`
- API `voltageValid`: `true / false`

Expected behavior:

- `voltageValid` must be `true` when the ADS1115/MUX path is available.
- `voltageV` must track the real battery input through the nominal 11:1 divider conversion.
- No production calibration tolerance is declared by this document. A material mismatch is a bring-up fault to investigate, not something to hide with a software constant.

Optional node check: divider node should be approximately `battery voltage / 11`.

## 3. Battery current path and sign

Connect a small known load through the normal battery current path. Do not use the 24 V lamp/load path for this check unless the hardware connection intentionally makes that load draw through the battery INA226.

Record:

- External reference current: `_____ A`
- API `currentA`: `_____ A`
- API `currentValid`: `true / false`
- API `shuntVoltageV`: `_____ V`

Expected relationship:

`currentA = shuntVoltageV / 0.010 Ω`

Pass criterion:

- Current drawn from the battery in the intended normal direction reports with the intended positive sign.
- Removing the load returns the reading close to the INA226 zero-current baseline; no exact zero tolerance is frozen here.
- `currentValid=false` must be used for unavailable/failed INA evidence; firmware must not substitute a fake `0 A` valid sample.

If the magnitude is correct but sign is reversed, treat it as INA IN+/IN- orientation evidence and correct the hardware/wiring authority before changing sign in software.

## 4. API completeness

Open:

`http://192.168.4.1/api/v1/battery`

Verify the response exposes these fields:

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

Expected behavior:

- `powerValid=true` only when both battery voltage and battery current are valid.
- `powerW` is derived from `voltageV * currentA`.
- Missing ADC or INA evidence is represented by the corresponding validity flag and `null` API value, not a fabricated valid zero.

## 5. Closeout evidence

The battery-monitor bench addition may be marked PASS only after all of the following are observed:

1. I2C `0x40` and `0x41` coexist.
2. Battery ADC voltage agrees materially with the multimeter/reference measurement.
3. Battery current magnitude and direction are physically consistent with the R010 shunt path.
4. `/api/v1/battery` returns valid real telemetry and fails closed when evidence is unavailable.

Do not infer or validate SOC percentage, low-battery threshold, charge-state classification or battery-health status here; those remain explicitly unresolved product/engineering decisions.
