# Figma Component Tree

This document defines the shared screen/component vocabulary used by design, firmware API and PWA implementation.

## Screens
1. Home
2. Voltage Test
3. Cable Test
4. Cross Scan
5. Lamp Test
6. Report
7. Wi-Fi Panel
8. Settings

## Shared components
- AppShell
- Header
- BottomNavigation
- ConnectionBadge
- TestCard
- ConnectorMap
- ChannelTable
- ChannelRow
- PulseBadge
- ResultBadge
- ConfirmationModal
- ReportCard

## Behavior rule
Visual appearance comes from Figma. Electrical behavior, safety and channel identity come from `docs/engineering/`. PWA code must not infer hardware behavior from screen artwork.