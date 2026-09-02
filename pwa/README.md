# BREMSECU G1 PWA Layout

Required implementation structure:

## Components
- `src/components/AppShell.tsx`
- `src/components/TopBrandBar.tsx`
- `src/components/BottomNavigation.tsx`
- `src/components/TestSelectionCard.tsx`
- `src/components/ConnectorMap.tsx`
- `src/components/ChannelTable.tsx`
- `src/components/PulseBadge.tsx`
- `src/components/ConnectionBadge.tsx`
- `src/components/ResultBadge.tsx`
- `src/components/ConfirmationModal.tsx`
- `src/components/ReportCard.tsx`

## Screens
- `src/screens/FirstContactScreen.tsx`
- `src/screens/TestEntryScreen.tsx`
- `src/screens/NewVehicleRecordScreen.tsx`
- `src/screens/VoltageScreen.tsx`
- `src/screens/CableScreen.tsx`
- `src/screens/LampScreen.tsx`
- `src/screens/TerminationScreen.tsx`
- `src/screens/ReportScreen.tsx`
- `src/screens/SettingsScreen.tsx`

## Modals
- `src/modals/ExistingRecordSearchModal.tsx`
- `src/modals/Pin10ValidationModal.tsx`
- `src/modals/Pin11ValidationModal.tsx`
- `src/modals/Pin12ValidationModal.tsx`
- `src/modals/AxleLiftSafetyModal.tsx`
- `src/modals/ReportSaveModal.tsx`
- `src/modals/UnsavedResultsModal.tsx`
- `src/modals/ReportRecordSearchModal.tsx`

## Hooks / services / store
- `src/hooks/useWebSocket.ts`
- `src/hooks/useTestEngine.ts`
- `src/services/api.ts`
- `src/services/report-builder.ts`
- `src/services/share.ts`
- `src/store/`

Visual authority: `docs/figma/`.
Hardware/test authority: `docs/engineering/`.

The PWA never overrides firmware safety interlocks.
There is no standalone Cross Scan screen or test in the approved architecture.
