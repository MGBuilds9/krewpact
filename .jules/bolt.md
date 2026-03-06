# Jules Bolt Learnings

## Rules — DO NOT VIOLATE

1. **NEVER replace setTimeout/useDebounce with useDeferredValue for network requests.** useDeferredValue is ONLY for deferring expensive UI renders. It does NOT enforce time delays and WILL spam APIs on every keystroke.
2. **NEVER optimize server components (async function).** Server components render once on the server — there are no re-renders to optimize. No useMemo, useCallback, or static object extraction.
3. **NEVER delete or rewrite existing learning entries in this file.** Only append new entries.
4. **NEVER add junk files** (search.sh, debug scripts, etc.) to PRs.
5. **NEVER create premature micro-optimizations** where the data set is small (< 100 items) and the operation is O(N). Only optimize when there's a measurable bottleneck.
