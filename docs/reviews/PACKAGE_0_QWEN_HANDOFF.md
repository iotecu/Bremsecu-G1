# BREMSECU G1 REV-2 — Package 0 Qwen Handoff

Status: QWEN PATCH-PROPOSAL AUTHORIZED FOR PACKAGE 0 ONLY
Parent authority: `docs/reviews/REV2_REMEDIATION_PLAN.md`
Independent review status of parent plan: **PLAN PASS**

## Operating model — IMPORTANT

Qwen has **NO Git/repository access and NO project filesystem access** in this workflow.

Qwen must work only from the exact source material supplied in the conversation/input package.

Qwen MUST NOT be instructed to:
- inspect a branch,
- open Git files,
- checkout anything,
- search the repository,
- commit,
- push,
- create a PR,
- verify Git state.

ChatGPT is the only integration controller for Git in this workflow.

Workflow:

`ChatGPT reads Git -> ChatGPT supplies exact current files/spec to Qwen -> Qwen returns proposed changed file contents/diffs -> ChatGPT independently reviews -> ChatGPT applies approved changes to Git -> independent third reviewer audits the real Git diff`

---

## Objective
Package 0 establishes a deterministic firmware build gate before functional remediation.

Qwen receives the required current file contents directly from ChatGPT/user. It must not assume access to anything not supplied.

---

# Authorized Package 0 scope

1. Correct the `shorts` / `shortcuts` compile-name mismatch.
2. Evaluate/build the supplied firmware snapshot if Qwen's execution environment permits.
3. If an actual PlatformIO build resolves an `espressif32` version, report that exact version and propose the pin. If not actually observed, return `PENDING BUILD ENVIRONMENT`; never invent a version.
4. Propose a minimal `.github/workflows/firmware-build.yml` that runs `pio run` from `firmware/`.
5. Do not implement or propose Packages 1–10.

---

## `shorts` authority

The supplied authoritative declaration in `firmware/include/test_engine.h` is:

```cpp
ShortCandidate shorts[kMaxShorts];
uint8_t shortCount = 0;
```

Therefore callers referring to the same `TestResults` member as `shortcuts` must be proposed as `shorts`.

Known affected files that ChatGPT will supply:

- `firmware/src/tests/test_engine.cpp`
- `firmware/src/api/ws_server.cpp`
- `firmware/src/storage/test_result_store.cpp`

Do not rename the authoritative `shorts` member.
Do not alter Cross Scan classification logic in Package 0.

---

## Build rule

If Qwen has a runnable PlatformIO environment, it may test the supplied snapshot with:

```sh
cd firmware
pio run
```

If execution is unavailable, Qwen must explicitly say `BUILD NOT EXECUTED` and must not claim BUILD PASS.

Additional compile errors may be proposed for correction only when they are unambiguous compile-only defects. Any issue requiring a hardware, safety, calibration, threshold, timing, API, or architecture decision must be reported rather than guessed.

---

## Platform pin rule

The supplied `firmware/platformio.ini` currently contains:

```ini
platform = espressif32
```

A pin may be proposed only if Qwen actually observes the exact resolved version during a successful PlatformIO build. Otherwise this remains PENDING for ChatGPT/user-side build verification.

Preserve:

```ini
links2004/WebSockets@2.4.1
```

No dependency upgrades are authorized.

---

## CI proposal

Qwen must return complete proposed contents for:

`.github/workflows/firmware-build.yml`

The workflow should minimally:
- run for relevant push / pull_request changes,
- checkout repository,
- set up Python,
- install PlatformIO Core,
- run `pio run` from `firmware/`,
- fail when the build fails.

No flashing, deployment, release, artifact publishing, PWA build, or unrelated tests.

---

# Frozen / Do Not Change

Do not propose changes to:
- ADC/MUX and socket mappings,
- TPIC/CAN relay mappings,
- `LOAD_OUTPUT_MASK`,
- ADS1115 address,
- safe-boot sequence,
- diagnostic thresholds,
- ADC/node-to-pin conversion,
- calibration,
- K1/K6/interlock behavior,
- confirmation lifecycle,
- load safety,
- continuity/cross-scan classification behavior,
- API/storage/PWA behavior.

---

# Required Qwen Output

Using only the supplied input files, return:

1. **INPUT FILES USED** — exact supplied files used.
2. **BUILD RESULT** — actual build result, or `BUILD NOT EXECUTED`.
3. **PLATFORM RESOLUTION** — exact observed version, or `PENDING BUILD ENVIRONMENT`.
4. **COMPILE FIXES** — file + symbol + exact proposed change.
5. **PROPOSED CHANGED FILES** — complete replacement content or unified diff for every proposed change, including CI workflow.
6. **UNRESOLVED ITEMS** — anything that cannot be proven from supplied files/environment.
7. **SCOPE DECLARATION** — Packages 1–10 untouched.
8. **HANDOFF** — state: `These are proposals only. ChatGPT must review and apply them to Git.`

Qwen must not ask for Git access. If more source context is genuinely required, it should name the exact missing file; ChatGPT will retrieve it and supply it.
