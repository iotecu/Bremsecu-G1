import assert from 'node:assert/strict';
import test from 'node:test';
import {
  API_ENDPOINTS,
  APPROVED_TEST_MODES,
  ERROR_CODES,
  WEBSOCKET_EVENT_TYPES,
} from '../src/services/contracts';
import { getDevelopmentContractFixtures } from '../src/services/dev/contract-fixtures';

test('HTTP endpoint constants match the approved firmware contract exactly', () => {
  assert.deepEqual(API_ENDPOINTS, {
    device: '/api/v1/device',
    status: '/api/v1/status',
    testStart: '/api/v1/test/start',
    testStop: '/api/v1/test/stop',
    testConfirm: '/api/v1/test/confirm',
    records: '/api/v1/records',
    reportSaveResult: '/api/v1/report/save-result',
    report: '/api/v1/report',
    settings: '/api/v1/settings',
  });
});

test('approved test modes match firmware authority and do not expose Cross Scan as a mode', () => {
  assert.deepEqual(APPROVED_TEST_MODES, [
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
  ]);
  assert.equal(APPROVED_TEST_MODES.includes('cross_scan'), false);
});

test('telemetry event names are limited to the documented server-originated contract', () => {
  assert.deepEqual(WEBSOCKET_EVENT_TYPES, [
    'device_status',
    'test_started',
    'test_stopped',
    'active_measurement',
    'channel_update',
    'cross_scan_update',
    'cable_test_progress',
    'cable_test_completed',
    'pulse_update',
    'load_current_update',
    'termination_result',
    'warning',
    'fault',
    'record_updated',
  ]);
});

test('important firmware error families remain stable machine codes', () => {
  assert.deepEqual(ERROR_CODES, [
    'SAFETY_INTERLOCK',
    'INVALID_TEST_MODE',
    'INVALID_CAN_RELAY_COMBINATION',
    'EXTERNAL_ENERGY_DETECTED',
    'TEST_ALREADY_ACTIVE',
    'ENGINEERING_VALUE_PENDING',
    'STORAGE_ERROR',
    'SENSOR_ERROR',
  ]);
});

test('development fixtures are blocked outside the explicit development boundary', () => {
  assert.throws(
    () => getDevelopmentContractFixtures(),
    /disabled outside Vite development mode/,
  );
});

test('development fixtures can be inspected explicitly by tests and stay contract-shaped', () => {
  const fixtures = getDevelopmentContractFixtures({
    allowOutsideViteDevForTests: true,
  });

  assert.equal(fixtures.testStartRequest.mode, 'iso7638_voltage');
  assert.equal(fixtures.telemetry[0]?.type, 'active_measurement');
  assert.equal(fixtures.telemetry[0]?.payload.classificationFinal, false);
});
