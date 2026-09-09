# BREMSECU G1 REV-2 — Package 0 Qwen Handoff

Status: QWEN ANALYSIS / PATCH-PROPOSAL AUTHORIZED FOR PACKAGE 0 ONLY
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md`
Independent review status of parent plan: **PLAN PASS**

## Operating model — IMPORTANT

Qwen has **read-only Git access** for this workflow.

Qwen MUST NOT:

- commit,
- push,
- create/update branches,
- open PRs,
- modify GitHub files,
- claim that changes are already applied to the repository.

Qwen's job is to inspect the repository, perform local/temporary analysis/build work if its environment permits, and return the proposed changes to ChatGPT/user for independent inspection.

**ChatGPT remains the integration controller.** ChatGPT will inspect Qwen's proposed changes, compare them with repository authority, apply approved edits to Git, and then send the resulting Git diff to the independent third reviewer.

---

## Objective
Establish a deterministic firmware build gate before any functional remediation.

This package is intentionally narrow. Qwen may propose fixes for compile blockers, determine the exact ESP32 PlatformIO platform version used by a successful build, and propose the CI workflow. It must not change diagnostic logic, thresholds, safety behavior, hardware mappings, API behavior, storage behavior, or PWA behavior.

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
Propose replacing only invalid member-name references from `shortcuts` to `shorts` wherever they refer to `TestEngine::TestResults`.

Known locations:

- `firmware/src/tests/test_engine.cpp` — `addShort(...)` writes `gRes.shortcuts[...]`
- `firmware/src/api/ws_server.cpp` — cable progress reads `r.shortcuts[i]`
- `firmware/src/api/ws_server.cpp` — cross-scan update reads `r.shortcuts[g.shorts]`
- `firmware/src/api/ws_server.cpp` — cable-completed serialization reads `r.shortcuts[i]`
- `firmware/src/storage/test_result_store.cpp` — raw cross-scan evidence reads `r.shortcuts[i]`

### Rule
Do **not** propose renaming the declaration in `test_engine.h` to `shortcuts`. The authoritative member remains `shorts`.

### Required check
Perform a repository-wide search for `shortcuts` and report every remaining occurrence. Distinguish invalid `TestResults.shortcuts` references from unrelated text/comments if any.

Do not alter Cross Scan classification logic in Package 0. Its unit-domain defect belongs to later packages.

---

## 2. Establish the first real `pio run` build

If Qwen's local environment permits, run from `firmware/`:

```sh
pio run
```

If Qwen cannot execute PlatformIO, it must say so explicitly and must not claim BUILD PASS. In that case, return the proposed compile fixes and exact commands for ChatGPT/user-side verification.

If additional compile errors appear after the known `shorts` mismatch is fixed, Qwen may propose repairs **only if** they are unambiguous compile/integration defects and do not require an engineering, safety, calibration, timing, threshold, hardware-mapping, or API-design decision.

For every additional compile fix:

1. record the exact file and symbol;
2. explain why it is compile-only;
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

If Qwen can execute PlatformIO:

1. obtain a successful Package-0 build with current platform resolution after compile-only fixes;
2. report the exact `espressif32` platform version actually resolved;
3. propose the exact pinned `platform = ...` line using PlatformIO-supported syntax;
4. verify locally, if possible, that `pio run` still passes with that exact pin.

If Qwen cannot execute PlatformIO, **do not invent a platform version**. Return this item as `PENDING BUILD ENVIRONMENT`.

Preserve:

```ini
links2004/WebSockets@2.4.1
```

Do not propose library upgrades in Package 0.

---

## 4. Propose GitHub CI firmware build gate

Prepare the complete proposed contents for:

`.github/workflows/firmware-build.yml`

The workflow must:

- run on pushes and pull requests that can affect firmware/build configuration;
- check out the repository;
- set up a supported Python environment;
- install PlatformIO Core;
- run the firmware build from `firmware/`;
- execute the same effective command as local verification: `pio run`;
- fail when the firmware build fails.

Keep it minimal. Do not add deployment, release, flashing, artifact publishing, PWA build, or unrelated tests.

Qwen does **not** create this file in Git. It returns the complete proposed file to ChatGPT.

---

# Frozen / Do Not Touch

Package 0 proposals must not alter:

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

No functional remediation from Packages 1–10 is authorized.

---

# Qwen Required Output

Do not claim a generic `PASS` and do not claim repository changes were made.

Return exactly these sections:

1. **REPO INSPECTION** — branch/ref inspected and files read.
2. **BUILD RESULT** — command and actual result, or `NOT EXECUTED` with reason.
3. **PLATFORM RESOLUTION** — exact resolved version if actually observed; otherwise `PENDING BUILD ENVIRONMENT`.
4. **COMPILE FIXES** — each file + symbol + exact proposed change.
5. **PROPOSED FILE CONTENTS** — complete replacement contents for every file that should change, or a precise unified diff for each; include the complete `.github/workflows/firmware-build.yml` proposal.
6. **REMAINING `shortcuts` SEARCH** — complete search result summary.
7. **PROPOSED CHANGED FILES** — complete list only; no extra files.
8. **SCOPE DECLARATION** — explicit confirmation that Packages 1–10 were not implemented/proposed.
9. **HANDOFF TO CHATGPT** — state clearly: `No Git changes were made. These are proposals for ChatGPT review and application.`

After Qwen returns its proposal, ChatGPT will independently inspect every proposed edit before applying anything to Git. Only the ChatGPT-applied Git diff will be sent to the independent third reviewer for adversarial review.
