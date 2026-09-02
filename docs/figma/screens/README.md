# Figma Screen References

This folder contains the approved Bremsecu G1 UI screen PNGs.

## Source of truth

The canonical screen list and exact filenames are defined in:

- `docs/figma/screen-inventory.md`

Do not use the old generic 8-screen naming scheme. In particular, there is no standalone `cross-scan` screen in the current approved architecture.

## Rules

- Store only approved/final screen PNGs here.
- Use the exact canonical filenames from `screen-inventory.md`.
- PNGs are visual/UI references; electrical behavior and safety logic come from `docs/engineering/`.
- If a screen's behavior cannot be understood from the PNG alone, document that behavior in the relevant Markdown authority file rather than inventing UI behavior in code.

## Assets

Reusable icons, connector images and brand artwork do not belong in this folder. They belong under:

- `docs/figma/assets/icons/`
- `docs/figma/assets/connectors/`
- `docs/figma/assets/brand/`
