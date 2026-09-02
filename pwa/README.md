# BREMSECU G1 PWA Layout

Required implementation structure:

- `src/components/ConnectorMap.tsx`
- `src/components/ChannelTable.tsx`
- `src/components/PulseBadge.tsx`
- `src/components/ConnectionBadge.tsx`
- `src/components/ReportCard.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/VoltageScreen.tsx`
- `src/screens/CableScreen.tsx`
- `src/screens/CrossScanScreen.tsx`
- `src/screens/LampScreen.tsx`
- `src/screens/ReportScreen.tsx`
- `src/screens/WifiPanelScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/hooks/useWebSocket.ts`
- `src/hooks/useTestEngine.ts`
- `src/services/api.ts`
- `src/services/report-builder.ts`
- `src/services/share.ts`
- `src/store/`

Visual authority: `docs/figma/`.
Hardware/test authority: `docs/engineering/`.

The PWA never overrides firmware safety interlocks.