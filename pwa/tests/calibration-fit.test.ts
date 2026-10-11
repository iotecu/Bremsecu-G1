import assert from 'node:assert/strict';
import test from 'node:test';
import { fitLinearCalibration } from '../src/services/calibration-fit';

test('linear calibration fit recovers slope and offset from multiple bench points', () => {
  const fit = fitLinearCalibration([
    { nodeV: 0.10, referenceV: 1.20 },
    { nodeV: 1.00, referenceV: 10.20 },
    { nodeV: 2.00, referenceV: 20.20 },
    { nodeV: 3.00, referenceV: 30.20 },
  ]);
  assert.ok(fit);
  assert.ok(Math.abs(fit.slope - 10.0) < 1e-9);
  assert.ok(Math.abs(fit.offset - 0.2) < 1e-9);
  assert.ok(fit.rmseV < 1e-9);
  assert.equal(fit.pointCount, 4);
});

test('linear calibration fit reports residual error instead of hiding noisy data', () => {
  const fit = fitLinearCalibration([
    { nodeV: 0.0, referenceV: 0.05 },
    { nodeV: 1.0, referenceV: 10.0 },
    { nodeV: 2.0, referenceV: 20.15 },
    { nodeV: 3.0, referenceV: 29.95 },
  ]);
  assert.ok(fit);
  assert.ok(fit.rmseV > 0);
  assert.ok(fit.maxAbsErrorV > 0);
});

test('linear calibration fit rejects insufficient or degenerate point sets', () => {
  assert.equal(fitLinearCalibration([{ nodeV: 1, referenceV: 12 }]), null);
  assert.equal(fitLinearCalibration([
    { nodeV: 1, referenceV: 12 },
    { nodeV: 1, referenceV: 24 },
  ]), null);
});
