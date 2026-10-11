import assert from 'node:assert/strict';
import test from 'node:test';
import { FirmwareRuntime } from '../src/services/runtime';
import type {
  FirmwareConnectionListener,
  FirmwareHttpService,
  FirmwareServices,
  FirmwareTelemetryService,
  TelemetryListener,
} from '../src/services/ports';
import type {
  JsonObject,
  TestConfirmationRequest,
  TestStartRequest,
} from '../src/services/contracts';

class FakeHttp implements FirmwareHttpService {
  calls: string[] = [];
  confirmationRequests: TestConfirmationRequest[] = [];
  device: JsonObject = { product: 'BREMSECU G1' };
  status: JsonObject = { activeRecordId: 'rec-1', activeTest: { active: false } };
  settings: JsonObject = { language: 'tr' };
  report: JsonObject = { record: { id: 'rec-1' } };

  async getDevice(){this.calls.push('device');return this.device;}
  async getStatus(){this.calls.push('status');return this.status;}
  async startTest(request:TestStartRequest){this.calls.push('start:'+request.mode);return {ok:true};}
  async stopTest(){this.calls.push('stop');return {ok:true};}
  async confirmTest(request:TestConfirmationRequest){
    this.calls.push('confirm');
    this.confirmationRequests.push(request);
    return request;
  }
  async getRecords(){this.calls.push('records');return {records:[]};}
  async createRecord(request:JsonObject){this.calls.push('create');return request;}
  async saveCurrentResult(request:JsonObject={}){this.calls.push('save-result');return request;}
  async getReport(recordId?:string){this.calls.push('report:'+(recordId??'active'));return this.report;}
  async updateReport(request:JsonObject){this.calls.push('update-report');return request;}
  async getSettings(){this.calls.push('settings');return this.settings;}
  async updateSettings(request:JsonObject){this.calls.push('update-settings');return request;}
}

class FakeTelemetry implements FirmwareTelemetryService {
  telemetryListeners=new Set<TelemetryListener>();
  connectionListeners=new Set<FirmwareConnectionListener>();
  subscribe(listener:TelemetryListener){this.telemetryListeners.add(listener);return()=>this.telemetryListeners.delete(listener);}
  subscribeConnection(listener:FirmwareConnectionListener){this.connectionListeners.add(listener);return()=>this.connectionListeners.delete(listener);}
  connect(){for(const listener of this.connectionListeners)listener('connecting');}
  disconnect(){for(const listener of this.connectionListeners)listener('idle');}
  emitConnection(state:'idle'|'connecting'|'open'|'closed'){for(const listener of this.connectionListeners)listener(state);}
  emit(event:Parameters<TelemetryListener>[0]){for(const listener of this.telemetryListeners)listener(event);}
}

function makeRuntime(){
  const http=new FakeHttp();
  const telemetry=new FakeTelemetry();
  const services:FirmwareServices={http,telemetry};
  return {http,telemetry,runtime:new FirmwareRuntime(services)};
}

test('runtime re-reads device, status and settings when WebSocket opens', async()=>{
  const {http,telemetry,runtime}=makeRuntime();
  runtime.start();
  telemetry.emitConnection('open');
  await new Promise((resolve)=>setTimeout(resolve,0));

  assert.equal(runtime.getSnapshot().connection,'open');
  assert.equal(runtime.getSnapshot().device?.product,'BREMSECU G1');
  assert.equal(runtime.getSnapshot().status?.activeRecordId,'rec-1');
  assert.equal(runtime.getSnapshot().settings?.language,'tr');
  assert.ok(http.calls.includes('report:rec-1'));
  runtime.stop();
});

test('record_updated refreshes authoritative status/report state', async()=>{
  const {http,telemetry,runtime}=makeRuntime();
  runtime.start();
  telemetry.emit({
    type:'record_updated',
    payload:{recordId:'rec-1',testId:'test-1'},
  });
  await new Promise((resolve)=>setTimeout(resolve,0));

  assert.ok(http.calls.includes('status'));
  assert.ok(http.calls.includes('report:active'));
  runtime.stop();
});

test('runtime preserves mode-bound safety confirmation requests', async()=>{
  const {http,runtime}=makeRuntime();
  const request:TestConfirmationRequest={
    type:'de_energized',
    value:true,
    mode:'can_termination_iso7638_tractor',
  };
  await runtime.confirmTest(request);
  assert.deepEqual(http.confirmationRequests,[request]);
});

test('runtime delegates only approved HTTP test intents and refreshes status', async()=>{
  const {http,runtime}=makeRuntime();
  const result=await runtime.startTest({mode:'cable_iso7638'});
  assert.equal(result.ok,true);
  assert.deepEqual(http.calls,['start:cable_iso7638','status']);
});


test('runtime accumulates live channel and cable evidence for UI rendering', async()=>{
  const {telemetry,runtime}=makeRuntime();
  runtime.start();
  telemetry.emit({
    type:'test_started',
    payload:{mode:'iso7638_voltage',accepted:true,classificationFinal:false},
  });
  telemetry.emit({
    type:'channel_update',
    payload:{mode:'iso7638_voltage',pin:1,engineeringValue:24.2,unit:'V',valid:true,classificationFinal:false},
  });
  telemetry.emit({
    type:'cable_test_progress',
    payload:{socket:'7638',currentPin:1,continuity:'PASS',classificationFinal:false},
  });
  telemetry.emit({
    type:'cross_scan_update',
    payload:{mode:'cable_iso7638',focusPin:1,scannedPin:2,delta:0.15,isCoupled:true,classificationFinal:false},
  });

  assert.equal(runtime.getSnapshot().channelUpdates['iso7638_voltage:1']?.engineeringValue,24.2);
  assert.equal(runtime.getSnapshot().cableProgressByPin['7638:1']?.continuity,'PASS');
  assert.equal(runtime.getSnapshot().crossScanByPair['cable_iso7638:1:2']?.isCoupled,true);
  runtime.stop();
});


test('final voltage snapshot overwrites preview evidence for the same pin', async()=>{
  const {telemetry,runtime}=makeRuntime();
  runtime.start();
  telemetry.emit({
    type:'test_started',
    payload:{mode:'iso7638_voltage',accepted:true,classificationFinal:false},
  });
  telemetry.emit({
    type:'channel_update',
    payload:{mode:'iso7638_voltage',pin:4,nodeValue:0.110,measurementPhase:'preview',stable:false,classificationFinal:false},
  });
  telemetry.emit({
    type:'channel_update',
    payload:{mode:'iso7638_voltage',pin:4,nodeValue:0.105,k6OffNodeV:0.880,measurementPhase:'final',stable:true,classificationFinal:false},
  });

  const finalPayload=runtime.getSnapshot().channelUpdates['iso7638_voltage:4'];
  assert.equal(finalPayload?.measurementPhase,'final');
  assert.equal(finalPayload?.stable,true);
  assert.equal(finalPayload?.nodeValue,0.105);
  assert.equal(finalPayload?.k6OffNodeV,0.880);
  runtime.stop();
});


test('runtime creates the real service record before refreshing active status', async()=>{
  const {http,runtime}=makeRuntime();
  const result=await runtime.createRecord({
    tractorPlate:'34 ABC 123',
    trailerPlate:'34 DRS 456',
    vehicleSideContext:'tractor+trailer',
    trailerConnectionType:'iso12098',
  });
  assert.equal(result.tractorPlate,'34 ABC 123');
  assert.deepEqual(http.calls,['create','status']);
});


test('runtime persists completed test evidence and report metadata through firmware', async()=>{
  const {http,runtime}=makeRuntime();
  await runtime.saveCurrentResult({technicianNote:'checked'});
  await runtime.updateReport({diagnosisNote:'line fault',serviceNote:'repaired',fee:'1200'});
  assert.ok(http.calls.includes('save-result'));
  assert.ok(http.calls.includes('update-report'));
  assert.ok(http.calls.filter((call)=>call.startsWith('report:')).length>=2);
});
