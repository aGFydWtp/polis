# Handoff: PR 14 — Make Vectorized Code Readable + Blob Injection Tests

## Goal

The scalar functions (`comment_stats`, `add_comparative_stats`, `repness_metric`,
`finalize_cmt_stats`) read like a step-by-step recipe. Their vectorized replacement
(`compute_group_comment_stats_df`) buries the same logic in 150 lines of DataFrame
plumbing. The vectorized path is the ONLY production code path — the scalar functions
are dead code, called only from tests and benchmarks.

**PR 14 must make the vectorized code at least as readable as the scalar code, then
delete the scalar functions.** This also enables vectorized blob injection tests —
the only non-tautological way to verify correctness against the Clojure math blob.

Similar readability refactors are needed for `conversation.py` and `pca.py`, but
those are separate PRs (PR 14b, PR 14c) — PR 14 scopes to `repness.py` only.

## Starting point

Branch off `jc/clj-parity-d9-fix` (Stack 13). This is BELOW D5-D8 in the stack,
so the refactor will be inherited by all formula fix PRs.

## Current stack (as of 2026-03-18, may shift with further rebases)

```
Stack 13: jc/clj-parity-d9-fix           ← branch off HERE for PR 14
Stack 14: jc/clj-parity-d5-prop-test      (draft PR #2448)
Stack 15: jc/clj-parity-d6-two-prop-test  (draft PR #2449)
Stack 16: jc/clj-parity-d7-repness-metric (draft PR #2450)
Stack 17: jc/clj-parity-d8-finalize-stats (draft PR #2451)
Stack 18: jc/clj-parity-d15-moderation-handling-zeros-vs-removes (PR #2452)
Stack 19: jc/clj-parity-kmeans-k-divergence (PR #2453)
Stack 20: jc/clj-parity-d10-rep-comment-selection
Stack 21: jc/clj-parity-d11-consensus-comment-selection
Stack 22: jc/clj-parity-d3-k-smoother-buffer
Stack 23: jc/clj-parity-d12-comment-priorities
Stack 24: jc/clj-parity-d1-pca-sign-flip-prevention
Stack 25: jc/clj-parity-pr15-load-votes-sort
```

D5-D8 are draft PRs waiting for vectorized blob tests before being marked ready.

## Task sequence

### 1. Refactor `compute_group_comment_stats_df` (repness.py)

Split into two phases:

**(a) DataFrame construction** (the plumbing):
- Build participant→group mapping
- Compute total counts per comment
- Create full (group, comment) cross-product index
- Join total counts, compute "other" counts

**(b) Statistics computation** (the readable part):
A new function with clean DataFrame inputs (columns: `na`, `nd`, `ns`,
`other_agree`, `other_disagree`, `other_votes`) → outputs (columns: `pa`, `pd`,
`pat`, `pdt`, `ra`, `rd`, `rat`, `rdt`, `agree_metric`, `disagree_metric`, `repful`).

This function should read like the scalar recipe:
```python
# Probabilities with pseudocounts
df['pa'] = (df['na'] + PSEUDO_COUNT/2) / (df['ns'] + PSEUDO_COUNT)
# Proportion tests
df['pat'] = prop_test_vectorized(df['na'], df['ns'])
# Representativeness ratios
df['ra'] = df['pa'] / df['other_pa']
# ...etc
```

### 2. Write vectorized blob injection tests for PR 14

Inject Clojure group memberships + votes into the new statistics function,
compare output to blob values. Test the PRODUCTION code path.

For each `(group, tid)` in the blob's `repness`:
- Compare `pat` (or `pdt`) to blob `p-test`
- Compare `rat` (or `rdt`) to blob `repness-test`
- Compare `pa` (or `pd`) to blob `p-success`
- Compare `repful` to blob `repful-for`

The blob only stores the winning side's values. `repful-for` tells you which
side won: if `agree`, then `n-success`=na, `p-test`=pat, `repness-test`=rat.
If `disagree`, then `n-success`=nd, `p-test`=pdt, `repness-test`=rdt.

### 3. Verify scalar ≡ vectorized

Run both paths on all datasets, compare outputs field by field. Must be
identical (not just close — exact match) since they implement the same formulas.

### 4. Delete scalar functions

Remove: `comment_stats`, `add_comparative_stats`, `repness_metric`,
`finalize_cmt_stats`, and scalar `prop_test`/`two_prop_test` if no longer
needed (the vectorized versions remain).

Update all tests that called the scalar API.

### 5. Cascade rebase

Rebase D5→D6→D7→D8→D15→k-divergence→D10→D11→D3→D12→D1→PR15 on top.
Use `.claude/skills/pr-stack/rebase-stack.sh` for the cascade.

### 6. Add per-PR vectorized blob injection tests

Each fix PR that modifies a computation stage MUST have a blob comparison
test that FAILS before the fix and PASSES after (RED→GREEN TDD). Insert
the test commit before the fix commit in each branch.

**Repness fixes (compare against blob `repness` entries):**
- **D5** (prop_test): compare `pat`/`pdt` to blob `p-test`
- **D6** (two_prop_test): compare `rat`/`rdt` to blob `repness-test`
- **D7** (metric): verify ranking order — which tids are selected matches blob
  (the metric value itself isn't stored in the blob, but the selection it
  drives IS stored as the list of entries in `repness[gid]`)
- **D8** (repful): compare `repful` to blob `repful-for`

**Selection fixes (compare against blob selected entries):**
- **D10** (rep comment selection): compare selected tids per group to
  blob `repness[gid]` tid list
- **D11** (consensus): compare selected tids to blob `consensus.agree[]`
  and `consensus.disagree[]` tid lists

**Conversation/PCA fixes:**
- **D15** (moderation): verify column count matches blob `n-cmts`, verify
  zeroed columns match blob `mod-out` tids
- **D12** (comment priorities): compare per-tid priority values to blob
  `comment-priorities`
- **D3** (k-smoother): synthetic tests for temporal stability. Add
  `@pytest.mark.skip(reason="requires replay infrastructure — see Replay PR B")`
  for incremental blob comparison (Clojure k-smoother state is accumulated
  over multiple polling iterations, not testable from cold-start blobs)
- **D1** (PCA sign flip): synthetic tests for sign consistency across updates.
  Add `@pytest.mark.skip(reason="requires replay infrastructure — see Replay PR B")`
  for incremental blob comparison (sign alignment needs previous components,
  which don't exist in cold-start blobs)

**Replay infrastructure** (Replay PRs A/B/C in the plan) was never built.
The VM Claude implemented D3 and D1 with synthetic-only tests, bypassing
replay. The skip markers above will be resolved when replay is implemented.

Then mark #2448-#2451 as ready (un-draft).

## Future: PR 14b (conversation.py) and PR 14c (pca.py)

Same readability refactoring for the other production code files:
- **PR 14b**: `conversation.py` — clustering, in-conv, k-smoother, priorities
- **PR 14c**: `pca.py` — PCA computation, sign alignment, projections

These are separate PRs after PR 14 is done, following the same pattern:
refactor for readability → add blob injection tests → delete dead code.

## Key blob context

- `n-trials` in the Clojure blob = `S` (total seen, INCLUDING passes), not
  `A+D` (agrees + disagrees). Verified: `prop_test(11, 14)` matches blob
  `p-test` for tid=49 group 0 in vw (A=2, D=11, S=14, A+D=13).
- `group-votes[gid].votes[tid]` = `{A: agrees, D: disagrees, S: total_seen}`
- Blob `repness[gid][i]` fields: `n-success`, `n-trials`, `p-success`,
  `p-test`, `repness` (=ra or rd), `repness-test` (=rat or rdt),
  `repful-for`, `tid`, `best-agree` (optional).
- Blob `consensus` = `{agree: [{tid, n-success, n-trials, p-success, p-test}], disagree: [...]}`
- Blob `comment-priorities` = `{tid_str: priority_value}`
- Blob `group-clusters` = list of `{id, members}` — use for injection
- Blob `in-conv` = list of participant IDs
- Blob `mod-out` = list of moderated-out tids
- Blob `n-cmts` = total comment count (including moderated)

## Files to modify

- `delphi/polismath/pca_kmeans_rep/repness.py` — the refactor
- `delphi/tests/test_discrepancy_fixes.py` — vectorized blob tests
- `delphi/tests/test_repness_unit.py` — update for new API
- `delphi/tests/test_old_format_repness.py` — update for new API
- `delphi/polismath/benchmarks/bench_repness.py` — update imports

## Reference

- Journal: `delphi/docs/CLJ-PARITY-FIXES-JOURNAL.md` — Session 11 entry,
  PR 14 readability goal in Notes for Future Sessions
- Plan: `delphi/docs/PLAN_DISCREPANCY_FIXES.md` — mandatory blob comparison
  section in Testing Principles, PR 14 section, Replay Infrastructure section
- Clojure source: `math/src/polismath/math/stats.clj` (prop-test, two-prop-test),
  `math/src/polismath/math/repness.clj` (finalize-cmt-stats, repness-metric)
