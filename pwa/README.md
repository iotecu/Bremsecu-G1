# BREMSECU G1 PWA

Production PWA implementation governed by `docs/pwa/REPLIT_HANDOFF.md` and its
ordered authority map.

## Current implementation phase

Phase 1 establishes only the buildable React/Vite/TypeScript scaffold and the
blocking i18n foundation. Product screens, routes, firmware services, PWA
installation and approved visual styling are intentionally not implemented in
this phase.

The temporary foundation screen verifies:

- the canonical 14-locale order;
- Turkish source/default/fallback behavior;
- immediate language switching without application reload;
- persistent selection under `bremsecu.locale`;
- Arabic and Persian RTL handling;
- application-state preservation while changing language;
- locale-aware number and date formatting.

## Commands

```bash
npm install
npm run check:i18n
npm test
npm run build
npm run dev
```

`npm run build` always runs locale validation and automated tests before the
TypeScript and Vite production build.

## Phase boundary

No screen, navigation, diagnostic, firmware, WebSocket or production mock
behavior may be added until the current phase is accepted.

The PWA never overrides firmware safety interlocks. There is no standalone
Cross Scan screen or test in the approved architecture.
