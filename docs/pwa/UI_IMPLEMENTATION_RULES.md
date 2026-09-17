# BREMSECU G1 — UI IMPLEMENTATION RULES

Status: FINAL

Goal: reproduce the approved Figma UI, not reinterpret it.

## 1. Visual authority
At 390x844, the numbered PNGs under `docs/figma/screens/` are the baseline visual references.

Use `docs/figma/design-tokens.json` for canonical colors/type/radii and `docs/figma/assets/replit/` for implementation assets.

Figma is fallback-only for unresolved visual detail. Do not repeatedly query Figma during normal implementation.

## 2. Fidelity rule
Match the approved reference in:
- overall geometry,
- spacing,
- card proportions,
- typography hierarchy,
- icon placement,
- border/stroke treatment,
- accent colors,
- modal prominence,
- fixed header/footer behavior.

Do not "improve" visual hierarchy, simplify controls, replace icons, introduce a different design system, or apply generic mobile UI defaults.

## 3. Baseline and responsive behavior
- Baseline viewport: 390x844.
- At 390x844, visual comparison must closely match the approved screenshots.
- On other phone/tablet sizes, preserve hierarchy, proportions and usability without changing product structure.
- Do not turn the design into a desktop dashboard/grid merely because more width is available.
- Safe-area handling may be added where required by the device, but must not visually distort the baseline layout.

## 4. Assets
Use files in `docs/figma/assets/replit/` as the asset authority.

Known mappings:
- `resistance.svg` -> CAN Bus termination resistor
- `find.svg` -> old-record/search
- `write.svg` -> new vehicle record
- `report-2.svg` -> report
- `battery-status.svg` -> battery visual
- `icon-back.svg` -> Back
- `icon-home.svg` -> Home
- `icon-settings.svg` / `icon-settings-large.svg` -> Settings
- `icon-wifi.svg` -> Wi-Fi state icon
- `tractor-icon.png` -> tractor
- `trailer-icon.png` -> trailer

Carousel left/right arrows are NOT asset files. Recreate them with CSS or inline SVG to match the screenshots. Do not search for missing arrow files and do not substitute third-party icons.

`icon-wifi.svg` is one asset. Connected/online is green; disconnected/offline is red using state styling. Do not create separate online/offline asset files.

Preserve `battery-status.svg` as a vector/state-capable asset where dynamic battery presentation requires it.

## 5. Colors and typography
Do not guess colors. Use exact values from `docs/figma/design-tokens.json`.

Do not globally replace a screen-specific accent with the Bremsecu red. Category accents are intentional.

Use the exact font family/weight/size role where defined. Do not substitute a "close" weight if the required web font is available.

## 6. Main visual structure
Selection/navigation screens:
- fixed top/header area,
- fixed bottom navigation,
- central content region used for the carousel,
- centered active card with the approved neighboring-card visibility where shown.

Measurement/result screens are fixed functional screens, not carousel cards.

## 7. States and data
Production UI values must come from application/firmware state where dynamic.

Do not hard-code fake voltage/current/test results into production UI merely to match screenshots.

Screenshot sample values are reference content for appearance only unless they are static labels.

Development preview data may exist behind an explicit mock/dev boundary, but production builds must not depend on it.

## 8. Modals and safety states
Safety/confirmation overlays must retain the approved visual prominence and warning treatment.

Do not reduce them to toast messages, browser confirms, bottom sheets or inline text.

The shared report-save/unsaved-results element remains an overlay, not a standalone page.

## 9. i18n
All user-facing strings pass through the i18n layer. Follow `docs/figma/i18n.md`.

Do not hard-code Turkish strings into reusable components as the only source of text.

Technical identities such as ISO 7638, ISO 12098, pin numbers and electrical units must remain unambiguous across languages.

## 10. Performance and dependency restraint
This PWA runs locally from an ESP32 environment. Keep the production bundle lean.

Do not add a large UI framework, animation library, icon pack, cloud SDK or analytics package solely for convenience when CSS/React/TypeScript already covers the requirement.

No cloud dependency is allowed for core operation.

## 11. Forbidden UI invention
Do NOT add:
- extra screens,
- extra routes,
- socket popups not in the approved flow,
- live pin animations not in the approved flow,
- decorative onboarding,
- hamburger navigation,
- dashboard widgets,
- new gestures,
- alternate themes,
- substituted iconography,
- speculative error/status UX.

When a screenshot does not show behavior, follow `NAVIGATION_RULES.md`, `PAGE_TREE.md` and the firmware contract. Do not invent behavior from appearance.
