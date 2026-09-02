# Firmware Source Layout

Required implementation structure:

- `main.cpp`
- `services/adc_service.cpp`
- `services/tpic_control.cpp`
- `services/pulse_monitor.cpp`
- `services/ina226_service.cpp`
- `services/rtc_service.cpp`
- `services/sd_service.cpp`
- `wifi/wifi_manager.cpp` — AP+STA dual mode
- `wifi/mdns_service.cpp` — optional only
- `tests/test_engine.cpp`
- `tests/voltage_test.cpp`
- `tests/cable_test.cpp`
- `tests/cross_scan.cpp`
- `tests/can_termination.cpp`
- `tests/lamp_test.cpp`
- `tests/axle_lift.cpp`
- `api/api_server.cpp`
- `api/websocket_server.cpp`
- `storage/config_store.cpp`
- `storage/report_store.cpp`
- `safety/interlocks.cpp`
- `safety/fault_manager.cpp`

Implementation agents must keep this layout unless the repository architecture is deliberately revised first.