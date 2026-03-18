# Bolt's Journal

## Rules — DO NOT VIOLATE

1. **NEVER replace setTimeout/useDebounce with useDeferredValue for network requests.** useDeferredValue is ONLY for deferring expensive UI renders. It does NOT enforce time delays and WILL spam APIs on every keystroke.
2. **NEVER optimize server components (async function).** Server components render once on the server — there are no re-renders to optimize. No useMemo, useCallback, or static object extraction.
3. **NEVER delete or rewrite existing learning entries in this file.** Only append new entries.
4. **NEVER add junk files** (search.sh, debug scripts, start.log, bun.lock, binary screenshots) to PRs.
5. **NEVER create premature micro-optimizations** where the data set is small (< 200 items) and the operation is O(N). Only optimize when there's a measurable bottleneck.
6. **NEVER create duplicate PRs for the same optimization.** Check existing PRs and bolt.md entries first.
7. **NEVER disable CI triggers or GitHub Actions** in PRs. The CI pipeline must always run.
8. **NEVER commit bun.lock, start.log, or binary screenshot files.** This project uses npm, not bun.

## Rejected Optimizations — DO NOT REVISIT

These patterns were reviewed during repo hygiene and intentionally declined. Do NOT create PRs for these:

1. **filter().length → reduce()** — Data sets are <200 items. The intermediate array allocation is negligible. Not worth the readability cost.
2. **Hoisting toLowerCase() outside filter loops** — Same reason. Microsecond savings on tiny arrays.
3. **Memoizing static components (Card, Button, Badge)** — These render once per page load. No re-render to prevent.
4. **Promise.all on 2-3 sequential API calls** — Adds complexity for negligible latency gain on endpoints that take <50ms total.
5. **Extracting Framer Motion variant objects as constants** — Dashboard uses minimal animations. No measurable benefit.
