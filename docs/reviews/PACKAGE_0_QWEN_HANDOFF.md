# BREMSECU G1 REV-2 — Package 0 Qwen Handoff

Status: PACKAGE 0 PROPOSAL AUTHORIZED
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md`
Independent review status of parent plan: **PLAN PASS**

## Read these public-repo files first

Repository: `iotecu/Bremsecu-G1`
Branch: `review/rev2-remediation-plan`

Open and read:

- `docs/reviews/REV2_REMEDIATION_PLAN.md`
- `docs/reviews/PACKAGE_0_QWEN_HANDOFF.md`
- `firmware/include/test_engine.h`
- `firmware/src/tests/test_engine.cpp`
- `firmware/src/api/ws_server.cpp`
- `firmware/src/storage/test_result_store.cpp`
- `firmware/platformio.ini`

Do not modify the repository. Return proposed changes for ChatGPT review and application.

---

# Package 0 only

## 1. Fix `shorts` / `shortcuts`

Authority in `firmware/include/test_engine.h`:

```cpp
ShortCandidate shorts[kMaxShorts];
uint8_t shortCount = 0;
```

Therefore every invalid `TestResults.shortcuts` use must become `TestResults.shorts`.

Known affected files:

- `firmware/src/tests/test_engine.cpp`
- `firmware/src/api/ws_server.cpp`
- `firmware/src/storage/test_result_store.cpp`

Search the relevant source for every `shortcuts` occurrence and report the exact locations.

Do not rename the authoritative `shorts` member.
Do not change Cross Scan logic, thresholds, or behavior in Package 0.

## 2. Build check

If your environment can run PlatformIO, run from `firmware/`:

```sh
pio run
```

If you cannot run it, say only `BUILD NOT EXECUTED`. Do not infer build success.

If additional compile errors appear, propose only clear compile-only corrections. If an error requires an engineering/safety/calibration/design decision, stop on that item and report it.

## 3. Platform pinning

Current `firmware/platformio.ini` contains:

```ini
platform = espressif32
```

If you actually run a successful PlatformIO build, report the exact resolved `espressif32` version and propose pinning to that exact version.

If you cannot observe the resolved version, report:

`PLATFORM PIN: PENDING BUILD ENVIRONMENT`

Do not guess a version.

Preserve:

```ini
links2004/WebSockets@2.4.1
```

## 4. CI workflow proposal

Prepare complete proposed contents for:

`.github/workflows/firmware-build.yml`

It must minimally:

- run on relevant `push` and `pull_request` events,
- checkout the repo,
- set up Python,
- install PlatformIO Core,
- run `pio run` with `working-directory: firmware`,
- fail when the build fails.

No flashing, deployment, release, PWA build, artifact publishing, or unrelated work.

---

# Do not touch

Package 1–10 are out of scope.
Do not propose changes to hardware mappings, TPIC/CAN mapping, `LOAD_OUTPUT_MASK`, safe boot, ADC conversion, calibration, K1/K6/interlocks, confirmations, load safety, diagnostic thresholds/classification, API semantics, storage semantics, or PWA behavior.

---

# Return exactly this

1. **FILES READ**
2. **`shortcuts` OCCURRENCES** — exact file/location list
3. **COMPILE FIXES** — exact proposed changes
4. **BUILD RESULT** — actual result or `BUILD NOT EXECUTED`
5. **PLATFORM PIN** — exact observed version or `PENDING BUILD ENVIRONMENT`
6. **CI FILE** — complete `.github/workflows/firmware-build.yml`
7. **PROPOSED DIFFS / REPLACEMENT CONTENTS**
8. **SCOPE DECLARATION** — Package 1–10 untouched

Do not invent code examples. Base every proposed change on the files you actually read.
