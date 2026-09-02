# REV-2 Bring-up Results

## Confirmed PASS
- 12V input power
- 5V buck: ~5.02V
- 3.3V buck: ~3.28V
- ESP32 power
- TPIC chain communication and physical OUT1..OUT22 walk test
- MOSFET output switching
- K1..K6 relay actuation after correcting prototype TQ relay orientation
- ADS1115 + 4x CD4051 scan
- DS3231 RTC detection/time increment
- microSD mount/write/read after correcting module supply
- INA226 I2C and bus-voltage measurement
- Wi-Fi 2.4GHz STA connection
- AP+STA simultaneous operation
- Browser access to measurement UI over local IP

## Not yet fully closed
- INA226 current/shunt calibration under real load
- final GND two-reference thresholds
- final calibration coefficients
- final CAN termination tolerance windows

## Discovery behavior
Direct IP access is authoritative. mDNS was tested and did not work reliably on the phone-hotspot path, therefore it is optional only.