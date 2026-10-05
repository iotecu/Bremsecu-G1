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
