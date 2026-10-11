export interface CalibrationPoint {
  readonly nodeV: number;
  readonly referenceV: number;
}

export interface LinearCalibrationFit {
  readonly slope: number;
  readonly offset: number;
  readonly rmseV: number;
  readonly maxAbsErrorV: number;
  readonly pointCount: number;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function fitLinearCalibration(points: readonly CalibrationPoint[]): LinearCalibrationFit | null {
  const valid = points.filter((point) => finite(point.nodeV) && finite(point.referenceV));
  if (valid.length < 2) return null;
  const n = valid.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (const point of valid) {
    sumX += point.nodeV; sumY += point.referenceV;
    sumXX += point.nodeV * point.nodeV; sumXY += point.nodeV * point.referenceV;
  }
  const denominator = (n * sumXX) - (sumX * sumX);
  if (!finite(denominator) || Math.abs(denominator) < 1e-12) return null;
  const slope = ((n * sumXY) - (sumX * sumY)) / denominator;
  const offset = (sumY - (slope * sumX)) / n;
  if (!finite(slope) || !finite(offset)) return null;
  let sumSquaredError = 0, maxAbsErrorV = 0;
  for (const point of valid) {
    const error = ((point.nodeV * slope) + offset) - point.referenceV;
    sumSquaredError += error * error;
    maxAbsErrorV = Math.max(maxAbsErrorV, Math.abs(error));
  }
  const rmseV = Math.sqrt(sumSquaredError / n);
  return finite(rmseV) && finite(maxAbsErrorV)
    ? { slope, offset, rmseV, maxAbsErrorV, pointCount: n }
    : null;
}
