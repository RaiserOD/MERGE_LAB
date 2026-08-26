# ACTIVE TASK

Task memory: exactly one task at a time. Fill this in **before** writing code,
not as a summary afterwards — its job is to bound the change, and a boundary
written after the fact bounds nothing.

When the task is done, fold the outcome into `CURRENT_STATE.md` and reset this
file to the idle block below.

---

**STATUS:** NONE

No task in flight. B2's implementation order is complete; see
`CURRENT_STATE.md` → "Blocked on human decisions" for what needs a decision
before any of it can start.

---

## Template

```
TASK_ID:
  ML-0XX

GOAL:
  One sentence. What is true after this task that isn't true now.

CONTEXT:
  Why now, and what it builds on.

FILES_ALLOWED_TO_CHANGE:
  src/...
  tests/...
  Anything outside this list needs a note explaining why.

DEPENDENCIES:
  ML-0XX (done), ML-0XX (done)

REQUIREMENTS:
  - Testable statements, one per line.

NON_REQUIREMENTS:
  - What this task deliberately does not do, so scope doesn't drift into it.

ACCEPTANCE_CRITERIA:
  - How a reviewer confirms it works.

TESTS_REQUIRED:
  - tests/unit/...
  - tests/integration/...

STATUS:
  IN_PROGRESS
```

On completion, before resetting:

```
STATUS:
  DONE

RESULT:
  What actually happened, including anything that turned out differently.

CHANGED_FILES:
  ...

TESTS:
  165 passed / 0 failed

BUILD:
  PASS

UNRESOLVED:
  Anything left open — this is the part that must reach CURRENT_STATE.md.
```
