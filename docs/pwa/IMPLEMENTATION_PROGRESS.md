# BREMSECU G1 PWA — IMPLEMENTATION PROGRESS

This file records implementation gates. It does not override any authority in
`REPLIT_HANDOFF.md`.

Baseline: `origin/main` at `923db4a77df2e87cd1704092042fcda14f7d9030`.

## Phase plan

1. Buildable scaffold and blocking i18n foundation
2. Route, state and navigation model
3. Canonical tokens, local assets and application shell
4. Firmware service interfaces and development-only contract fixtures
5. Approved UI, delivered in four bounded screen groups
6. Real ESP32 HTTP/WebSocket integration
7. Manifest, Service Worker, offline package and ESP32 static build
8. Full 40-state visual and functional verification

## Phase 1 — ready for review

- [x] React/Vite/TypeScript scaffold builds.
- [x] Exactly 14 local locale resources exist in the approved order.
- [x] Turkish is source, default and fallback.
- [x] Language selection persists under `bremsecu.locale`.
- [x] Language changes preserve mounted application state.
- [x] Arabic and Persian set root RTL; LTR restoration is verified.
- [x] Locale-aware number and date formatting is available.
- [x] Missing, extra, empty and placeholder-mismatched translations fail checks.
- [x] Deliberate missing-key negative verification fails as expected.
- [x] Production build passes with no external runtime translation dependency.
- [x] No product route, screen, diagnostic flow or firmware client was added.

Phase 2 must not begin until Phase 1 is accepted.
