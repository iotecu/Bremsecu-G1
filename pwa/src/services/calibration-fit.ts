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

export function fitLinearCalibration(
  points: readonly CalibrationPoint[],
): LinearCalibrationFit | null {
  const valid = points.filter(
    (point) => finite(point.nodeV) && finite(point.referenceV),
  );
  if (valid.length < 2) return null;

  const n = valid.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const point of valid) {
    sumX += point.nodeV;
    sumY += point.referenceV;
    sumXX += point.nodeV * point.nodeV;
    sumXY += point.nodeV * point.referenceV;
  }

  const denominator = (n * sumXX) - (sumX * sumX);
  if (!finite(denominator) || Math.abs(denominator) < 1e-12) return null;

  const slope = ((n * sumXY) - (sumX * sumY)) / denominator;
  const offset = (sumY - (slope * sumX)) / n;
  if (!finite(slope) || !finite(offset)) return null;

  let sumSquaredError = 0;
  let maxAbsErrorV = 0;
  for (const point of valid) {
    const predicted = (point.nodeV * slope) + offset;
    const error = predicted - point.referenceV;
    sumSquaredError += error * error;
    maxAbsErrorV = Math.max(maxAbsErrorV, Math.abs(error));
  }

  const rmseV = Math.sqrt(sumSquaredError / n);
  if (!finite(rmseV) || !finite(maxAbsErrorV)) return null;

  return {
    slope,
    offset,
    rmseV,
    maxAbsErrorV,
    pointCount: n,
  };
}
