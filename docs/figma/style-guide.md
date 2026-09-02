# BREMSECU Figma Style Guide

Status: PARTIALLY CONFIRMED from the approved Figma node and user-supplied final PNG set.

## Visual language

Bremsecu G1 uses a dark industrial diagnostic interface with high-contrast white typography, a fluorescent lime action/status accent, restrained borders, and colored side ribbons that identify test families or target sides.

The approved PNGs in `docs/figma/screens/` are the final visual authority for layout and per-screen composition.

## Confirmed base colors

From the approved Figma screen node:

- App background: `#11141A`
- Test-card background: `#181A21`
- Primary text / border: `#FFFFFF`
- Lime accent/border: `#CDF711`
- Dark side-label text used on white panels: `#272D40`

Other semantic colors visible in the approved screen set (warning red, cable blue, termination amber, report cyan, trailer red, status greens/greys) must be sampled/confirmed from the approved artwork before being promoted to global tokens.

## Confirmed typography

### Primary display/test heading
- Family: `Montserrat`
- Weight: ExtraBold
- Confirmed reference size: `26px`
- Color: white

### Vertical side label reference
- Family: `Lato`
- Weight: ExtraBold
- Confirmed reference size: `32px`
- Confirmed letter spacing: approximately `2.88px`

### Utility / small UI text
- Family: `Inter`
- Figma Body Small variable: `14px`, weight `400`, line-height `1.4`
- Language badge reference uses Inter Light at `12px`

## Confirmed geometry reference

The reviewed mobile frame is `390 × 844 px`.

Reference values from the ISO 7638 voltage-selection screen:
- main dark test card: `243 × 418 px`, radius `10px`
- supporting white side panel: `266 × 418 px`, radius `10px`
- bottom navigation container: `321 × 59 px`
- language badge radius: `4px`

These are screen-specific confirmed values, not a universal spacing scale. Reusable spacing tokens should be derived from repeated values across the approved screen set rather than guessed.

## Reusable visual rules

- Keep the application background consistently dark.
- Use lime for primary actions, positive confirmations and active emphasis.
- Use white for high-priority headings and connector/test labels.
- Preserve the compact Bremsecu brand header with Wi-Fi and language status.
- Preserve the three-action bottom navigation pattern where shown.
- Test-selection screens use a large central card with a side ribbon and connector/test artwork.
- Live measurement screens use a compact test header, active-measurement block, channel table and report action.
- Safety/conditional confirmations use modal/safety-card treatment and must not be visually diluted into ordinary informational dialogs.

## Implementation rule

PWA components must consume shared tokens/components rather than duplicating per-screen styling. Do not infer electrical behavior, pin meaning or safety state from visual color alone; those rules come from `docs/engineering/`.

## Asset handling

Reusable artwork belongs under:
- `assets/icons/`
- `assets/connectors/`
- `assets/brand/`

Font files are not stored in the repository. The style guide records font families/weights only.
