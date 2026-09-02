# BREMSECU G1 — Data Model

Status: IMPLEMENTATION CONTRACT for persistent records and PWA state.

## ServiceRecord
Fields:
- `id`
- `createdAt`
- `updatedAt`
- `customerName`
- `companyName`
- `technicianId`
- `tractorPlate`
- `trailerPlate`
- `tractorChassis`
- `trailerChassis`
- `fleetOrTrailerNo`
- `vehicleSideContext`
- `trailerConnectionType` (`iso12098_15pin` or `24n_24s_2x7`)
- `tests[]`
- `diagnosisNote`
- `serviceNote`
- `fee`
- `reportLogoId`
- `status`

## TestResult
Fields:
- `id`
- `mode`
- `targetSide`
- `startedAt`
- `completedAt`
- `overallStatus`
- `classificationFinal`
- `channels[]`
- `confirmations[]`
- `technicianNote`
- `rawEvidence`

## ChannelResult
Fields:
- `channelId`
- `pin`
- `function`
- `measurementFamily`
- `rawValue`
- `engineeringValue`
- `unit`
- `status`
- `classificationFinal`
- `pulseState`
- `currentValue`
- `note`

Measurement families must follow `docs/engineering/measurement-methods.md`.

## Confirmation
Examples:
- ignition/de-energized confirmation for CAN termination
- Pin 10 lining-wear function present / function absent
- Pin 11 brake-system function present / function absent
- Pin 12 axle-lift function present / function absent
- axle-lift air-pressure/vehicle-safe confirmation

Fields:
- `type`
- `value`
- `timestamp`
- `operatorId`

## Technician
Fields:
- `id`
- `name`
- `active`

## Settings
Fields:
- `language`
- `keepScreenAwake`
- `technicians[]`
- `serviceCompany`
- `serviceAddress`
- `servicePhone`
- `serviceEmail`
- `reportLogoId`

The supported language set is fixed by `docs/figma/i18n.md`.

## DeviceInfo
Fields:
- `product`
- `model`
- `firmwareVersion`
- `hardwareRevision`
- `serialNumber`
- `productionDate`

## Persistence rules
- Service and test records are firmware-controlled persistent data.
- PWA state is not the authoritative record store.
- Completed results saved to a service record must retain raw evidence plus interpreted values when practical.
- PENDING engineering classifications must preserve `classificationFinal=false`.
- Record identifiers must remain stable across reconnect/reload.
- Report generation consumes stored record/test data and must not silently recompute with newly invented limits.
