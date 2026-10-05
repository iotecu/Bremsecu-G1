import assert from 'node:assert/strict';
import test from 'node:test';
import { createScreenTestServices } from '../src/screen-test/services';
import { FirmwareRuntime } from '../src/services/runtime';
import { voltageClassificationForPin, voltageForPin } from '../src/services/view';
import { isScreenTestBuild } from '../src/screen-test/mode';

for (const mode of ['iso7638_voltage', 'iso12098_voltage'] as const) {
  for (const scenario of ['pass', 'multi-fail', 'pending'] as const) {
    test(`screen-test ${mode} ${scenario} uses isolated in-memory telemetry`, async () => {
      const runtime = new FirmwareRuntime(createScreenTestServices(mode, scenario));
      runtime.start();
      try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const snapshot = runtime.getSnapshot();
        assert.equal(snapshot.connection, 'open');
        assert.equal(snapshot.status?.activeRecordId, 'SCREEN-TEST-RECORD');
        assert.equal(voltageClassificationForPin(snapshot, mode, 1), scenario === 'pending' ? null : scenario === 'multi-fail' ? 'FAIL' : 'PASS');
        assert.equal(voltageClassificationForPin(snapshot, mode, 2), scenario === 'pending' ? null : scenario === 'multi-fail' ? 'FAIL' : 'PASS');
        assert.equal(voltageForPin(snapshot, mode, mode === 'iso7638_voltage' ? 3 : 4)?.value, 0);
        assert.equal(voltageForPin(snapshot, mode, mode === 'iso7638_voltage' ? 6 : 14)?.value, 2.5);
        await runtime.stopTest();
        assert.deepEqual(runtime.getSnapshot().status?.activeTest, { active: false });
      } finally { runtime.stop(); }
    });
  }
}
test('screen-test flag is disabled in an ordinary Node environment', () => {
  assert.equal(isScreenTestBuild(), false);
});

test('screen-test cable mask and lamp current use the real view-model contracts', async () => {
  const { cableSummary, cableProgressForPin, loadCurrentForMode } = await import('../src/services/view');
  const runtime = new FirmwareRuntime(createScreenTestServices('iso7638_voltage', 'pass', {autoStart:false}));
  runtime.start();
  try {
    await runtime.startTest({mode:'cable_iso7638',enabledPinMask:0b101});
    assert.deepEqual(cableSummary(runtime.getSnapshot(),'cable_iso7638'),{pass:2,open:0,indeterminate:0,shortCount:0});
    assert.equal(cableProgressForPin(runtime.getSnapshot(),'7638',1)?.continuity,'PASS');
    assert.equal(cableProgressForPin(runtime.getSnapshot(),'7638',2),null);
    await runtime.startTest({mode:'lamp_iso12098',lampPin:3});
    assert.equal(loadCurrentForMode(runtime.getSnapshot(),'lamp_iso12098'),0.3);
  } finally { runtime.stop(); }
});

test('screen-test connection follows host health and rejects starting when disconnected', async () => {
  const previousFetch=globalThis.fetch;
  let healthy=true;
  globalThis.fetch=async(input) => {
    assert.equal(input,'./screen-test-health');
    if(!healthy) throw new Error('offline');
    return new Response(JSON.stringify({purpose:'SCREEN_TEST_ONLY'}),{status:200});
  };
  const runtime=new FirmwareRuntime(createScreenTestServices('iso7638_voltage','pass',{monitorHost:true,autoStart:false}));
  runtime.start();
  try {
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(runtime.getSnapshot().connection,'open');
    healthy=false;
    await new Promise(resolve=>setTimeout(resolve,1550));
    assert.equal(runtime.getSnapshot().connection,'closed');
    await assert.rejects(runtime.startTest({mode:'iso7638_voltage'}),/disconnected/);
    healthy=true;
    await new Promise(resolve=>setTimeout(resolve,1550));
    assert.equal(runtime.getSnapshot().connection,'open');
  } finally { runtime.stop();globalThis.fetch=previousFetch; }
});
