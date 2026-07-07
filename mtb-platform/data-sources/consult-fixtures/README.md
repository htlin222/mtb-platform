# fixtures — synthetic API shapes for the consult system

Machine-readable **shape** of the kfsyscc consult / EMR API, plus **fully
synthetic** sample payloads. Built so future UI / mock-server work can proceed
against realistic structures **without any real patient data ever touching
disk or git**.

## Contents

| Dir           | What                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `schema/`     | `<endpoint>.schema.json` — recursive `{field → type-token}` map. No values. |
| `mock/`       | `<endpoint>.mock.json` — the schema filled with invented values.            |
| `generate.py` | Regenerates both from the live API (in memory only).                        |
| `synth.py`    | The synthetic value pools (fake names, IDs, notes, dates).                  |

Type tokens in `schema/`: `str`, `int`, `float`, `bool`, `null`, `[]` (list;
`[T]` means "list of T", `[{…}]` means "list of objects with this shape").

## Endpoints captured

| File             | Source call                   | Notes                                   |
| ---------------- | ----------------------------- | --------------------------------------- |
| `consult_t_list` | `getconsult_t_list`           | team consult list envelope              |
| `consult_detail` | `load_data_consult`           | one consult (HISTORY/PURPOSE/OPINION…)  |
| `opd_icdh_list`  | `getord_icdh_list`            | OPD visit + ICD history                 |
| `inp_icdh_list`  | `getinp_icdh_list`            | inpatient ICD history (seed case empty) |
| `ser_icdh_list`  | `getser_icdh_list`            | catastrophic-illness cards (seed empty) |
| `emr_main_list`  | `note/timelinelist/main_list` | full EMR bundle (inp/opd/che/surgery…)  |
| `emr_inp_note`   | `note/timelinelist/inp_note`  | progress notes for one admission        |
| `emr_exam_list`  | `emr/mdlist_exam`             | scanned-document / exam index           |
| `consult_code`   | `getconsultcode`              | code tables (teams, statuses)           |

A few lists were empty for the seed patient (`inp_icdh_list`, `ser_icdh_list`),
so those schemas only capture the envelope. Re-run against a richer case to fill
the row shape.

## Safety model — why this is PHI-free by construction

`generate.py`:

1. Fetches one real response per endpoint, **held in memory only**.
2. Derives the schema by keeping **field names + types**, dropping every value.
3. Builds the mock by reading the **schema types only** — it never reads a real
   value — and filling from `synth.py`'s invented pools.
4. Two hard gates abort the run (writing nothing) if either fails:
   - **schema-clean**: every schema leaf must be a type token. A real value in a
     schema is impossible to miss.
   - **no-real-leak**: no real identifier (name / idno / chart / free-text) may
     appear anywhere in the generated mock.

Synthetic values are deliberately out-of-range so they can never collide with
real records: chart numbers are `99######`; national IDs are `Z0########`
(a real ID's 2nd char is the gender digit 1 or 2, so `Z0…` is structurally
impossible and never matches the PHI guard); free-text notes are canned English
sentences.

**Nothing real is written. Only `schema/` and `mock/` land on disk, and both are
safe to commit.**

## Regenerate

```bash
# needs a valid cookies.json at the project root; read-only against the API
MDT_COOKIES_PATH="$PWD/cookies.json" \
  .claude/skills/mdt/.venv/bin/python fixtures/generate.py
```
