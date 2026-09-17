# BREMSECU G1 REV-2

Engineering repository for the BREMSECU G1 REV-2 diagnostic platform.

## Repository authority
This repository is the common technical language for design agents, coding agents and reviewers.

- `docs/engineering/` — verified hardware, measurement, calibration and bring-up authority
- `docs/figma/` — visual handoff, screen references and design tokens
- `firmware/` — ESP32/PlatformIO implementation
- `pwa/` — technician PWA implementation
- `tests/` — validation and regression material

Read `docs/ARCHITECTURE.md` before implementation.

For Replit/PWA implementation, the single entry point is `docs/pwa/REPLIT_HANDOFF.md`. Read it completely and follow its linked authorities in order before changing PWA code.

Implementation agents must not replace verified engineering rules with assumptions.
