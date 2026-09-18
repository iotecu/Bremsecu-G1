import type { ApprovedTestMode, JsonObject, JsonValue } from './contracts';
import type { FirmwareRuntimeState } from './runtime';

function objectValue(value: JsonValue | undefined): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

export function stringField(value: JsonObject | null | undefined, key: string): string | null {
  const field = value?.[key];
  return typeof field === 'string' ? field : null;
}

export function numberField(value: JsonObject | null | undefined, key: string): number | null {
  const field = value?.[key];
  return typeof field === 'number' && Number.isFinite(field) ? field : null;
}

export function booleanField(value: JsonObject | null | undefined, key: string): boolean | null {
  const field = value?.[key];
  return typeof field === 'boolean' ? field : null;
}

export function objectField(value: JsonObject | null | undefined, key: string): JsonObject | null {
  return objectValue(value?.[key]);
}

export function activePinForMode(
  state: FirmwareRuntimeState,
  mode: ApprovedTestMode,
): number | null {
  const payload = state.activeMeasurement;
  return stringField(payload, 'mode') === mode ? numberField(payload, 'pin') : null;
}

export function voltageForPin(
  state: FirmwareRuntimeState,
  mode: ApprovedTestMode,
  pin: number,
): { value: number; unit: string; valid: boolean } | null {
  const payload = state.channelUpdates[mode + ':' + pin];
  if (!payload) return null;
  const value = numberField(payload, 'engineeringValue');
  if (value === null) return null;
  return {
    value,
    unit: stringField(payload, 'unit') ?? 'V',
    valid: booleanField(payload, 'valid') !== false,
  };
}

export function cableProgressForPin(
  state: FirmwareRuntimeState,
  iso: '7638' | '12098',
  pin: number,
): JsonObject | null {
  return state.cableProgressByPin[iso + ':' + pin] ?? null;
}

export function cableActiveProgress(
  state: FirmwareRuntimeState,
  iso: '7638' | '12098',
): { pin: number | null; percent: number | null } {
  const event = state.latestTelemetry.cable_test_progress;
  if (!event || stringField(event.payload, 'socket') !== iso) {
    return { pin: null, percent: null };
  }
  const progress = objectField(event.payload, 'progress');
  const completed = numberField(progress, 'completed');
  const total = numberField(progress, 'total');
  return {
    pin: numberField(event.payload, 'currentPin'),
    percent:
      completed !== null && total !== null && total > 0
        ? Math.round((completed / total) * 100)
        : null,
  };
}

export function hasCrossEvidence(
  state: FirmwareRuntimeState,
  mode: 'cable_iso7638' | 'cable_iso12098',
  pin: number,
): boolean {
  const prefix = mode + ':' + pin + ':';
  return Object.keys(state.crossScanByPair).some((key) => key.startsWith(prefix));
}

export function cableSummary(
  state: FirmwareRuntimeState,
  mode: 'cable_iso7638' | 'cable_iso12098',
): {
  pass: number;
  open: number;
  indeterminate: number;
  shortCount: number;
} | null {
  const payload = state.latestCableCompleted;
  if (!payload || stringField(payload, 'mode') !== mode) return null;
  const pass = numberField(payload, 'passCount');
  const open = numberField(payload, 'openCount');
  const indeterminate = numberField(payload, 'indeterminateCount');
  const shortCount = numberField(payload, 'shortCount');
  if (pass === null || open === null || indeterminate === null || shortCount === null) return null;
  return { pass, open, indeterminate, shortCount };
}

export function loadCurrentForMode(
  state: FirmwareRuntimeState,
  mode: 'lamp_iso12098' | 'axle_lift',
): number | null {
  const payload = state.latestLoadCurrent;
  if (!payload || stringField(payload, 'mode') !== mode) return null;
  const current = objectField(payload, 'current');
  if (booleanField(current, 'valid') !== true) return null;
  return numberField(current, 'value');
}

export function terminationResistanceOhms(
  state: FirmwareRuntimeState,
  mode: ApprovedTestMode,
): number | null {
  const payload = state.latestTermination;
  if (!payload || stringField(payload, 'mode') !== mode) return null;

  // Current REV-2 firmware publishes vhV/vlV/deltaV evidence but does not
  // publish an authoritative resistance value. Only render ohms if the
  // firmware contract later supplies it explicitly.
  return numberField(payload, 'resistanceOhms');
}

export function firmwareNetworkConnected(state: FirmwareRuntimeState): boolean {
  return state.connection === 'open';
}
