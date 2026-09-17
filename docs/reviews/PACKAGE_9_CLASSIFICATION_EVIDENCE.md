# Package 9 — Diagnostic Classification Expansion

Status: SPEC PASS / NO UNSUPPORTED LABEL EXPANSION

## Question reviewed

Package 9 asks whether the existing cable-test continuity result set:

- PASS
- OPEN
- INDETERMINATE

should be expanded with stronger labels such as:

- SHORT_TO_GND
- SHORT_TO_POWER
- HIGH_RESISTANCE

## Evidence decision

No new root-cause classification is added at this stage.

The current REV-2 measurement architecture can already preserve richer evidence:

- baseline node/pin voltage,
- focus node/pin voltage,
- calibrated delta,
- cross-scan coupled channel/pin evidence,
- external-energy pre-scan evidence.

However, the repository does not yet contain frozen, physically demonstrated signatures that uniquely distinguish SHORT_TO_GND, SHORT_TO_POWER or HIGH_RESISTANCE from other abnormal states across expected harness/load tolerances.

Introducing those labels now would turn an observed symptom into an unverified cause.

## Frozen Package 9 policy

1. Cable continuity classification remains `PASS / OPEN / INDETERMINATE`.
2. Cross Scan remains a separate coupling/miswire-candidate evidence channel.
3. Stronger diagnostic labels may be introduced only after a dedicated physical fault fixture proves a distinct signature and its thresholds/timing are frozen.
4. API, storage, reporting and future PWA must preserve raw evidence so a technician can see why an item is not yet classified more strongly.
5. No placeholder numeric threshold may be relabelled as a production diagnostic boundary.

## Future promotion gate

A future classification may become production-authorized only when all are true:

- the fault condition is physically reproducible;
- raw/node and calibrated/pin evidence are captured;
- the signature is distinguishable from neighboring fault modes;
- threshold/timing tolerance is characterized;
- firmware regression covers boundary behavior;
- integrated board validation confirms the end-to-end result.

## Result

Package 9 is complete for the current remediation stage by explicitly rejecting unsupported diagnostic certainty. No firmware behavior is weakened; evidence preservation remains intact for later expansion.
