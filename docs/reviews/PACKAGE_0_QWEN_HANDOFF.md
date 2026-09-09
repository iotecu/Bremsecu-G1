# BREMSECU G1 REV-2 — Package 0 Qwen Handoff

Status: IMPLEMENTATION AUTHORIZED FOR PACKAGE 0 ONLY
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md`
Independent review status of parent plan: **PLAN PASS**

## Objective
Establish a deterministic firmware build gate before any functional remediation.

This package is intentionally narrow. It may fix compile blockers, pin the ESP32 PlatformIO platform to the exact version proven by the build, and add CI. It must not change diagnostic logic, thresholds, safety behavior, hardware mappings, API behavior, storage behavior, or PWA behavior.

---

# Scope

## 1. Fix the `shorts` / `shortcuts` compile-name mismatch

### Authority
`firmware/include/test_engine.h` declares:

```cpp
ShortCandidate shorts[kMaxShorts];
uint8_t shortCount = 0;
```

The declared field name `shorts` is authoritative for this package.

### Known invalid references on current `main`
Replace only the invalid member-name references from `shortcuts` to `shorts` wherever they refer to `TestEngine::TestResults`.

Known locations from independent review and repo inspection:

- `firmware/src/tests/test_engine.cpp` — `addShort(...)` writes `gRes.shortcuts[...]`
- `firmware/src/api/ws_server.cpp` — cable progress reads `r.shortcuts[i]`
- `firmware/src/api/ws_server.cpp` — cross-scan update reads `r.shortcuts[g.shorts]`
- `firmware/src/api/ws_server.cpp` — cable-completed serialization reads `r.shortcuts[i]`
- `firmware/src/storage/test_result_store.cpp` — raw cross-scan evidence reads `r.shortcuts[i]`

### Rule
Do **not** rename the declaration in `test_engine.h` to `shortcuts`. Fix the invalid callers to use `shorts`.

### Required check
After the edits, perform a repository-wide search for `shortcuts` and prove that no invalid `TestResults.shortcuts` reference remains.

Do not alter Cross Scan classification logic in Package 0. Its unit-domain defect belongs to later packages.

---

## 2. Establish the first real `pio run` build

Run the firmware build from the repository's `firmware/` directory.

Required command:

```sh
pio run
```

If additional compile errors appear after the known `shorts` mismatch is fixed, you may repair them **only if** they are unambiguous compile/integration defects and do not require an engineering, safety, calibration, timing, threshold, hardware-mapping, or API-design decision.

For every additional compile fix:

1. record the exact file and symbol;
2. explain why it is a compile-only correction;
3. do not infer a PENDING engineering value;
4. do not broaden the package.

If a compile error requires a design decision, STOP and report it instead of guessing.

---

## 3. Pin the ESP32 PlatformIO platform

Current file:

`firmware/platformio.ini`

Current configuration contains:

```ini
platform = espressif32
```

This is not deterministic.

### Required method

1. First obtain a successful Package-0 build with the current platform resolution after compile-only fixes.
2. Record the exact `espressif32` platform version that PlatformIO resolved for that successful build.
3. Pin `platform = ...` to that **exact proven version** using PlatformIO-supported version syntax.
4. Run `pio run` again with the pinned platform.
5. The pinned build must also PASS.

### Hard rule
Do not choose an arbitrary platform version from memory or preference. The pinned version must be the version actually used by the successful verification build.

Preserve the already-frozen library dependency:

```ini
links2004/WebSockets@2.4.1
```

Do not upgrade libraries in this package.

---

## 4. Add GitHub CI firmware build gate

Create:

`.github/workflows/firmware-build.yml`

The workflow must:

- run on pushes and pull requests that can affect firmware/build configuration;
- check out the repository;
- set up a supported Python environment;
- install PlatformIO Core;
- run the firmware build from `firmware/`;
- execute the same effective build command as local verification: `pio run`;
- fail the workflow if the firmware build fails.

Keep the workflow minimal. Do not add deployment, release, flashing, artifact publishing, PWA build, or unrelated tests in Package 0.

If the CI build requires a PlatformIO cache, caching is optional; correctness is mandatory.

---

# Frozen / Do Not Touch

Package 0 must not modify any of the following except where a pure compile fix is unavoidable and explicitly reported:

- `channels.h` 26-channel ADC/MUX mapping
- ISO 7638 / ISO 12098 socket pin mappings
- TPIC output mapping
- CAN relay mapping
- `LOAD_OUTPUT_MASK`
- ADS1115 address `0x48`
- TPIC safe-boot sequence
- GPIO36/GPIO39 hardware interpretation
- diagnostic thresholds
- ADC/node-to-pin conversion logic
- calibration coefficients or payload schema
- K1/K6 behavior
- interlock semantics
- confirmation lifecycle
- load-test safety behavior
- continuity classification
- cross-scan classification thresholds
- API schema/behavior
- storage schema/behavior
- PWA code/dependencies

No functional remediation from Packages 1–10 is authorized here.

---

# Required Evidence / Acceptance Criteria

Package 0 is complete only when all of the following are true:

## BUILD PASS

- Clean local firmware build completes successfully with `pio run`.
- The exact resolved/pinned `espressif32` platform version is reported.
- Rebuild with the pinned platform also passes.

## STATIC SCOPE PASS

- All invalid `TestResults.shortcuts` references are removed.
- The authoritative member remains `TestResults.shorts`.
- No diagnostic/safety/calibration behavior is intentionally changed.

## CI PASS

- `.github/workflows/firmware-build.yml` exists.
- GitHub Actions runs `pio run` from `firmware/`.
- The workflow passes on the implementation branch/PR.

## CHANGE-SCOPE PASS

Expected changed files are limited to:

- the source files containing the compile-name mismatch;
- `firmware/platformio.ini`;
- `.github/workflows/firmware-build.yml`;
- optionally this handoff/review documentation if a status/evidence note is appended.

Any other changed file must be individually justified as a compile-only necessity.

---

# Qwen Required Handoff

When finished, do not claim a generic `PASS`.

Return exactly these evidence categories:

1. **BUILD RESULT** — command, exit result, and concise build summary.
2. **PLATFORM PIN** — exact resolved version and final pinned line in `platformio.ini`.
3. **COMPILE FIXES** — file + symbol + what was corrected.
4. **CI RESULT** — workflow path and run result/status.
5. **CHANGED FILES** — complete list.
6. **SCOPE DECLARATION** — explicit confirmation that Packages 1–10 were not implemented.
7. **REVIEW READY** — commit SHA / branch / PR reference for the independent adversarial reviewer.

After Qwen completes Package 0, implementation must be reviewed by the independent third reviewer before merge.
