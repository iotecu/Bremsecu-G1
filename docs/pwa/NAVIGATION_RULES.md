# BREMSECU G1 — NAVIGATION RULES

Status: FINAL

This file is the navigation/gesture authority. Do not infer navigation from visual similarity alone.

## 1. Entry
- Login opens Vehicle/Test Entry.
- Vehicle/Test Entry can create a new record, open old-record search, or enter tests when an active service record exists.
- Creating a new service record enters the Main Test Carousel.

## 2. Main Test Carousel
One route/state container. Exactly 8 cards, fixed order:
1. ISO 7638 Voltage
2. ISO 12098 Voltage
3. Cable Test
4. CAN Bus Termination
5. ISO 12098 Lamp / Axle Lift
6. Reports
7. Settings
8. Battery Status

Implementation state: `activeCardIndex` (0..7).

Allowed on this carousel only:
- left/right carousel arrows,
- horizontal swipe/drag,
- one-card movement per completed navigation action.

Header and bottom navigation remain fixed while the carousel content changes.

## 3. Nested CAN Bus selector
Inside Main Test Carousel card 4, CAN Bus Termination has exactly 4 sub-states, fixed order:
1. Tractor / ISO 7638
2. Tractor / ISO 12098
3. Trailer / ISO 7638
4. Trailer / ISO 12098

Use an independent state such as `canSubSlide`.

Hard requirement: a horizontal gesture handled by the nested CAN selector MUST NOT advance `activeCardIndex` in the parent carousel. Stop/contain gesture propagation at the nested carousel boundary.

## 4. Measurement and result screens
No carousel and no horizontal swipe navigation on:
- voltage measurement screens,
- cable measurement screens,
- lamp measurement screen,
- CAN safety confirmation screens,
- CAN resistance-result screens,
- conditional Pin 10/11/12 validation screens,
- axle-lift safety confirmation,
- report result/save states,
- settings detail,
- old-record search overlays.

Do not add swipe as a convenience on these screens.

## 5. Bottom navigation
Approved persistent bottom navigation behavior:
- Back: return to the immediate approved parent/context.
- Home: return to Main Test Carousel without inventing an intermediate dashboard.
- Settings: open Settings context defined by the approved flow.

The visual placement and icon treatment must match the screenshots.

Do not replace Back/Home/Settings with browser-default controls, tabs or a hamburger menu.

## 6. Conditional overlays and return behavior
- Pin 10 validation completes and returns to ISO 12098 Voltage measurement/result.
- Pin 11 validation completes and returns to ISO 12098 Voltage measurement/result.
- Pin 12 validation completes and returns to ISO 12098 Voltage measurement/result.
- Axle-lift safety confirmation completes and returns to Lamp Test.
- Shared unsaved/save-to-report overlay is an overlay, not a route.
- Entry-context old-record search and report-context old-record search may reuse one component, but must return to their originating contexts.

## 7. Reports
- Reports with active service record -> Report Result.
- Reports without active service record -> report-context Old Record Search.
- Retest keeps the same active service record and returns to Main Test Carousel.

## 8. Prohibited navigation changes
Do NOT:
- convert the 8 main cards into 8 routes,
- flatten the CAN nested selector into the main carousel,
- add tabs, side menus or extra home/dashboard pages,
- add swipe to measurement/result screens,
- create extra confirmation pages,
- change flow order for convenience,
- deduce new links from component proximity in screenshots.

`docs/pwa/PAGE_TREE.md` defines valid destinations. This file defines how the user moves between them.
