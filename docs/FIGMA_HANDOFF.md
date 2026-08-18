# Bremsecu G1 Figma Handoff

## Authoritative visual source

Approved Figma file:

`https://www.figma.com/design/w1EWJZpNwqisdHyhEXPay2/Bremsecu`

Figma is the authoritative visual reference for Bremsecu G1 PWA screens. Markdown files in `docs/` define required behavior, safety and reporting logic.

## Implementation rule

Qwen or any other implementation agent must reproduce the approved Figma design instead of redesigning it.

The PWA must be built from real HTML/CSS/JavaScript components. Full-screen screenshots must never be used as the application UI.

## Repository visual references

The repository should contain two types of exported visual material:

### Production assets

Assets actually used by the PWA, for example:
- Bremsecu logo
- ISO connector illustrations
- lamp illustration
- axle-lift icon
- product imagery where intentionally used
- custom project-owned icons

Preferred path:

`assets/figma/production/`

Prefer SVG for vector artwork and PNG/WebP only for raster artwork.

### Screen references

Selected screenshots of approved Figma screens used only for visual comparison during implementation and review.

Preferred path:

`assets/figma/reference-screens/`

These images are not runtime UI assets.

Suggested initial reference set:
- connection/login screen
- new vehicle registration
- old record recall/search
- ISO 12098 voltage test
- ISO 12098 cable test
- ISO 7638 voltage test
- ISO 7638 cable test
- ISO 12098 lamp-test selection
- ISO 12098 lamp-test measurement
- conditional PIN10 modal
- conditional PIN11 modal
- conditional PIN12 modal
- lamp-test axle-lift safety confirmation
- CAN termination safety/measurement screens
- report final screen
- report-save modal
- settings screen

## Visual comparison workflow

For each implemented screen:

1. implement from Figma + Markdown specification
2. run the PWA at the target mobile viewport
3. capture an implementation screenshot
4. compare it side by side with the approved Figma reference
5. correct spacing, typography, size, alignment, borders, icon placement and hierarchy
6. only then mark the screen visually complete

## Asset URL rule

Temporary Figma MCP/API asset URLs must not be committed as production dependencies because those links can expire.

Before implementation completion, required production visuals must exist as repository assets or as code-owned SVG/CSS equivalents.

## Conflict rule

- Figma controls visual appearance and screen hierarchy.
- `UI_SPEC.md` and `PWA_FLOW.md` control UI behavior.
- `SAFETY_RULES.md` controls mandatory safety behavior.
- `PIN_MAP.md` / verified engineering mapping controls electrical identity.
- `REPORT_RULES.md` controls report inclusion/exclusion.

If sources conflict, stop implementation and resolve the conflict instead of guessing.