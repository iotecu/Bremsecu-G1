export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const API_ENDPOINTS = {
  device: '/api/v1/device',
  status: '/api/v1/status',
  testStart: '/api/v1/test/start',
  testStop: '/api/v1/test/stop',
  testConfirm: '/api/v1/test/confirm',
  records: '/api/v1/records',
  reportSaveResult: '/api/v1/report/save-result',
  report: '/api/v1/report',
  settings: '/api/v1/settings',
} as const;

export const APPROVED_TEST_MODES = [
  'iso7638_voltage',
  'iso12098_voltage',
  'cable_iso7638',
  'cable_iso12098',
  'lamp_iso12098',
  'axle_lift',
  'can_termination_iso7638_tractor',
  'can_termination_iso7638_trailer',
  'can_termination_iso12098_tractor',
  'can_termination_iso12098_trailer',
] as const;

export type ApprovedTestMode = (typeof APPROVED_TEST_MODES)[number];

export const WEBSOCKET_EVENT_TYPES = [
  'device_status',
  'test_started',
  'test_stopped',
  'active_measurement',
  'channel_update',
  'cross_scan_update',
  'cable_test_baseline_ready',
  'cable_test_progress',
  'cable_test_completed',
  'pulse_update',
  'load_current_update',
  'termination_result',
  'warning',
  'fault',
  'record_updated',
] as const;

export type WebSocketEventType = (typeof WEBSOCKET_EVENT_TYPES)[number];

export const ERROR_CODES = [
  'SAFETY_INTERLOCK',
  'INVALID_TEST_MODE',
  'INVALID_CAN_RELAY_COMBINATION',
  'EXTERNAL_ENERGY_DETECTED',
  'TEST_ALREADY_ACTIVE',
  'ENGINEERING_VALUE_PENDING',
  'STORAGE_ERROR',
  'SENSOR_ERROR',
] as const;

export type FirmwareErrorCode = (typeof ERROR_CODES)[number];

export interface TestStartRequest extends JsonObject {
  readonly mode: ApprovedTestMode;
  readonly enabledPinMask?: number;
  readonly lampPin?: number;
  readonly deEnergizedConfirmed?: boolean;
  readonly axleSafetyConfirmed?: boolean;
}

export interface CommonResultFields {
  readonly testId?: string;
  readonly mode?: ApprovedTestMode;
  readonly side?: string;
  readonly channelId?: string;
  readonly pin?: string | number;
  readonly function?: string;
  readonly rawValue?: JsonValue;
  readonly engineeringValue?: JsonValue;
  readonly unit?: string;
  readonly status?: string;
  readonly classificationFinal?: boolean;
  readonly timestamp?: string | number;
  readonly note?: string;
}

export interface FirmwareErrorContext {
  readonly code: FirmwareErrorCode | string;
  readonly i18nKey?: string;
  readonly message?: string;
}

export interface TelemetryEvent<TPayload extends object = JsonObject> {
  readonly type: WebSocketEventType;
  readonly payload: TPayload;
}

export interface CrossScanUpdatePayload {
  readonly activeSourcePin?: string | number;
  readonly scannedComparisonChannel?: string;
  readonly measuredValue?: JsonValue;
  readonly expected?: boolean;
  readonly shortOrMiswireEvidenceState?: string;
  readonly scanProgress?: number;
}
