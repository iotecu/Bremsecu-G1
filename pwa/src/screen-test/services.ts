import type { ApprovedTestMode, JsonObject, TelemetryEvent } from '../services/contracts';
import type { FirmwareConnectionListener, FirmwareServices, TelemetryListener } from '../services/ports';

export type ScreenTestScenario = 'pass' | 'multi-fail' | 'pending';

/** In-memory display fixtures. Only the static host health endpoint is fetched; no hardware API, WebSocket, GPIO, relay or ADC access. */
export function createScreenTestServices(initialMode: ApprovedTestMode, scenario: ScreenTestScenario, options: { monitorHost?:boolean; autoStart?:boolean } = {}): FirmwareServices {
  const listeners = new Set<TelemetryListener>();
  const connections = new Set<FirmwareConnectionListener>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setTimeout> | undefined;
  let alive=false, connected=false;
  let controller:AbortController | undefined;
  const connection=(open:boolean) => { connected=open; for(const listener of connections) listener(open?'open':'closed'); };
  async function checkHost() {
    if(!alive) return;
    controller=new AbortController();
    const timeout=setTimeout(() => { controller?.abort();if(alive) connection(false); },2500);
    try { const response=await fetch('./screen-test-health',{cache:'no-store',signal:controller.signal});const data=await response.json();if(alive) connection(response.ok && data.purpose === 'SCREEN_TEST_ONLY'); }
    catch { if(alive) connection(false); }
    finally { clearTimeout(timeout);if(alive) poll=setTimeout(checkHost,1500); }
  }
  const requireHost=() => { if(options.monitorHost && !connected) throw new Error('ESP disconnected'); };
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
      connect() { alive=true; if(options.monitorHost) void checkHost();else connection(true); if(options.autoStart !== false) timer=setTimeout(() => showVoltage(initialMode),0); },
      disconnect() { alive=false;controller?.abort();clearTimeout(poll);clearTimeout(timer); for (const listener of connections) listener('idle'); },
    },
    http: {
      async getDevice() { return { product: 'BREMSECU — EKRAN TESTİ', serialNumber: 'TEST-ONLY', firmwareVersion: 'SCREEN-TEST' }; },
      async getStatus() { return { activeRecordId: record.id!, activeTest: { active } }; },
      async getSettings() { return settings; },
      async updateSettings(request) { settings = { ...settings, ...request }; return settings; },
      async startTest(request) {
        requireHost(); mode=request.mode;active=true;
        if(mode==='iso7638_voltage' || mode==='iso12098_voltage') showVoltage(mode);
        else {
          emit({type:'test_started',payload:{mode,accepted:true}});
          if(mode.startsWith('cable_')) {
            const count=mode==='cable_iso7638'?7:15;
            const pins=Array.from({length:count},(_,i)=>i+1).filter(pin=>(request.enabledPinMask ?? 0x7fff)&(1 << (pin-1)));
            pins.forEach((pin,index)=>emit({type:'cable_test_progress',payload:{mode,socket:mode==='cable_iso7638'?'7638':'12098',currentPin:pin,continuity:'PASS',progress:{completed:index+1,total:pins.length}}}));
            emit({type:'cable_test_completed',payload:{mode,passCount:pins.length,openCount:0,shortCount:0,indeterminateCount:0}});
          } else if(mode.startsWith('can_termination_')) emit({type:'termination_result',payload:{mode,engineeringValue:60,resistanceOhms:60,unit:'Ω',classificationFinal:false}});
          else emit({type:'load_current_update',payload:{mode,pin:request.lampPin ?? 12,current:{value:0.3,valid:true,unit:'A'},status:'PASS',classificationFinal:true}});
        }
        return {ok:true};
      },
      async stopTest() { active = false; emit({ type: 'test_stopped', payload: { mode, outcome: 'user_stop' } }); return { ok: true }; },
      async confirmTest() { requireHost();return { ok: true }; },
      async getRecords() { return { records: [record] }; },
      async createRecord(request) { record = { ...record, ...request }; return { ok: true, recordId: record.id! }; },
      async saveCurrentResult() { return { ok: true }; },
      async getReport() { return { record, serviceProvider: settings, tests: [{ id: 'SCREEN-TEST-RESULT', mode, classificationFinal: scenario !== 'pending', overallStatus: scenario === 'multi-fail' ? 'FAIL' : 'PASS' }] }; },
      async updateReport(request) { record = { ...record, ...request }; return { ok: true }; },
    },
  };
}
