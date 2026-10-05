# First physical ESP screen review — 2026-10-05

The user flashed the original 4 MB image onto an ESP32-WROOM-32 (ESP32-D0WD-V3), using CP210x/COM5 at 115200 baud. They inspected the phone/tablet UI, collected the following issues, and authorized a second package with direct navigation instead of the test-screen picker. This review supersedes the earlier carousel boundary behavior.

## Changes

- Removed the top test picker. The screen-test application opens at login and uses the normal record/test navigation. Deep links remain only for automated validation.
- Main carousel wraps in both directions, including battery → ISO7638. Main, CAN and cable selectors accept horizontal finger gestures and preserve vertical scrolling. CAN Back closes the nested selector; Home resets to the first ISO7638 start card.
- Expanded the canvas/cards across tablet and desktop widths while bounding zoom by viewport height. The content area scrolls independently of bottom navigation. ISO12098 Pin14/15 and its report action are reachable.
- Entry, login hotspot, settings, save and note icons are red. Home is white on its red background. Connected Wi-Fi is green/white and disconnected is red.
- Wi-Fi uses a no-cache ESP health request; losing/recovering the host updates the indicator. Sample commands are rejected while disconnected. Health monitoring is isolated from hardware APIs.
- Cable main → Start → standard selector now follows the approved two-coil design. CAN/voltage/lamp screens use tractor/trailer icons; vertical side labels are heavier and centered.
- Voltage row buttons select the displayed reading. Cable switches stop/restart the existing test with enabledPinMask, serialize changes, and surface failures. Turning off all cable pins stops without issuing an invalid zero-mask start.
- Axle confirmation uses a visible checkbox and a working confirmation action; the example axle pin/current appear after return. Load/cable examples now match the real view-model event shapes.
- Completed previously English-copied locale keys, localized report test names and lamp modes, and reviewed automotive terms and safety text, especially Russian/Arabic/Persian. All 14 dictionaries retain key/placeholder parity. Native-speaker wording review remains part of device acceptance.
- Converted socket/login images to WebP: 1,078,967 → 110,784 bytes (about 90% smaller). Images become visible after decoding. Static assets are cached; HTML revalidates and health is never cached.
- ZIP packaging now extracts LittleFS and compares every file, and rejects stale staging data. This catches mklittlefs add-file errors even if its process reports success.

## Limits kept explicit

This remains a standalone screen-test host, with sample measurements and RAM-only records. No GPIO/relay/ADC or diagnostic API is enabled. Voltage focus controls do not alter production firmware scanning; conditional-pin hardware behavior still requires the approved firmware contract. No physical production diagnosis is claimed.

HTTP hotspot shortcuts are not verified standalone PWA installs. Tapping the logo requests fullscreen where supported; HTTPS/service-worker/install acceptance is a separate delivery item. This review does not mark the Chrome address-bar/standalone installation issue fully resolved.

## Validation

- 79 automated tests, TypeScript, 14-locale parity and both screen-test/production builds passed.
- Compiled screen-test validated 40 routes and six voltage scenarios; no hardware network access.
- Headless Chrome with actual touch events: main wrap; cable sub-carousel and Back; CAN sub-carousel/wrap/Back/Home; ISO12098 Pin15 scrolling and focus; cable mask switches; lamp/axle confirmation; host disconnect/reconnect.
- Inspected phone 390×844, tablet 800×1280 and wide 1200×800 renders. This does not replace the user's next physical phone/tablet review.
- ESP32 application compiled; 4 MB partitions/offsets, ESP headers, ZIP integrity, SHA-256 and extracted LittleFS bytes verified before delivery.

Package: `Bremsecu-ESP32-Ekran-Test-V2.zip`. Upload uses the same COM5/115200 workflow, on the disconnected test board. This new V2 image has not yet been flashed on physical hardware.
