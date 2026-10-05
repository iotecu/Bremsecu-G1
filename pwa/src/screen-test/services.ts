import type { ApprovedTestMode, JsonObject, TelemetryEvent } from '../services/contracts';
import type { FirmwareConnectionListener, FirmwareServices, TelemetryListener } from '../services/ports';

export type ScreenTestScenario = 'pass' | 'multi-fail' | 'pending';

/** In-memory display fixtures. No fetch, WebSocket, GPIO, relay or ADC access. */
export function createScreenTestServices(initialMode: ApprovedTestMode, scenario: ScreenTestScenario): FirmwareServices {
  const listeners = new Set<TelemetryListener>();
  const connections = new Set<FirmwareConnectionListener>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settings: JsonObject = { language: 'tr', keepScreenAwake: true, serviceCompany: 'EKRAN TESTİ — ÖRNEK SERVİS', technicians: [{ id: 'test-tech', name: 'Test Teknisyeni', active: true }] };
  let record: JsonObject = { id: 'SCREEN-TEST-RECORD', companyName: 'TEST VERİSİ', tractorPlate: 'TEST 001', trailerPlate: 'TEST 002', technicianId: 'test-tech', diagnosisNote: '', serviceNote: '', fee: '' };
  let active = false;
  let mode = initialMode;
  const emit = (event: TelemetryEvent) => { for (const listener of listeners) listener(event); };
  function showVoltage(nextMode: ApprovedTestMode) {
    mode = nextMode; active = true;
    emit({ type: 'test_started', payload: { mode, accepted: true } });
    emit({ type: 'active_measurement', payload: { mode, pin: 1 } });
    const count = mode === 'iso7638_voltage' ? 7 : 15;
    for (let pin = 1; pin <= count; pin++) {
      const failed = scenario === 'multi-fail' && (pin === 1 || pin === 2);
      const ground = mode === 'iso7638_voltage' ? pin === 3 || pin === 4 : pin === 4 || pin === 13;
      const can = mode === 'iso7638_voltage' ? pin === 6 || pin === 7 : pin === 14 || pin === 15;
      const value = failed ? 0.8 : ground ? 0 : can ? 2.5 : 24;
      emit({ type: 'channel_update', payload: { mode, pin, engineeringValue: value, unit: 'V', valid: true, status: failed ? 'FAIL' : 'PASS', classificationFinal: scenario !== 'pending' } });
    }
  }
  return {
    telemetry: {
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      subscribeConnection(listener) { connections.add(listener); return () => connections.delete(listener); },
      connect() { for (const listener of connections) listener('open'); timer = setTimeout(() => showVoltage(initialMode), 0); },
      disconnect() { clearTimeout(timer); for (const listener of connections) listener('idle'); },
    },
    http: {
      async getDevice() { return { product: 'BREMSECU — EKRAN TESTİ', serialNumber: 'TEST-ONLY', firmwareVersion: 'SCREEN-TEST' }; },
      async getStatus() { return { activeRecordId: record.id!, activeTest: { active } }; },
      async getSettings() { return settings; },
      async updateSettings(request) { settings = { ...settings, ...request }; return settings; },
      async startTest(request) { showVoltage(request.mode); return { ok: true }; },
      async stopTest() { active = false; emit({ type: 'test_stopped', payload: { mode, outcome: 'user_stop' } }); return { ok: true }; },
      async confirmTest() { return { ok: true }; },
      async getRecords() { return { records: [record] }; },
      async createRecord(request) { record = { ...record, ...request }; return { ok: true, recordId: record.id! }; },
      async saveCurrentResult() { return { ok: true }; },
      async getReport() { return { record, serviceProvider: settings, tests: [{ id: 'SCREEN-TEST-RESULT', mode, classificationFinal: scenario !== 'pending', overallStatus: scenario === 'multi-fail' ? 'FAIL' : 'PASS' }] }; },
      async updateReport(request) { record = { ...record, ...request }; return { ok: true }; },
    },
  };
}
