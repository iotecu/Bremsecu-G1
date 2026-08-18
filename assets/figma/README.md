# Figma Assets

This directory receives exported visual material from the approved Bremsecu Figma file.

## production/
Runtime assets used by the PWA.

Examples:
- logos
- connector illustrations
- lamp artwork
- axle-lift icon
- project-owned custom icons

Prefer SVG for vectors. Use PNG/WebP for raster artwork.

## reference-screens/
Approved Figma screenshots used only for visual comparison during implementation and review.

Do not render these screenshots as the actual application UI.

## Rule
Do not depend on temporary Figma MCP/API asset URLs in production code. Export/copy required assets into the repository before release.