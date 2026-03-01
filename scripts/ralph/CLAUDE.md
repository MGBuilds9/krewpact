# Ralph Iteration Instructions

You are running inside a Ralph loop. Each iteration gets a fresh context. Your memory comes from `prd.json`, `progress.txt`, git history, and `AGENTS.md`/`CLAUDE.md`.

## Phase 1: Read State

1. **Read `prd.json`** — find the highest-priority story where `passes: false`
2. **Read `progress.txt`** — check the **Codebase Patterns** section FIRST (top of file). These are hard-won lessons from previous iterations.
3. **Read `AGENTS.md` and/or project `CLAUDE.md`** — understand project conventions, stack, test commands
4. **Verify git branch** — check out or create the branch from `prd.json.branchName`. Create from `main` if it doesn't exist.

If ALL stories have `passes: true`, output `<promise>COMPLETE</promise>` and exit.

## Phase 2: Implement (One Story Only)

5. **Implement ONLY the current story.** One story per iteration. No scope creep.
6. **Write tests FIRST (TDD):**
   - Write a failing test that validates the acceptance criteria
   - Run it to confirm it fails
   - Implement the minimal code to make it pass
   - Run it to confirm it passes
7. **Follow existing codebase patterns** from progress.txt and AGENTS.md
8. **For UI stories:** Verify in browser if dev-browser skill is available

## Phase 3: MANDATORY QUALITY CHECKPOINT

**You CANNOT commit or mark `passes: true` until ALL of these pass:**

### 3a: Lint Check
- Run the project's linter on all changed files
- Auto-fix safe issues and stage fixes
- If unfixable lint errors remain → fix them before proceeding

### 3b: Type Check
- TypeScript: `npx tsc --noEmit`
- Python: `pyright` or `mypy`
- Skip if not applicable

### 3c: Full Test Suite
- Run the **complete** test suite — ALL tests, not just the current story
- If ANY test fails (including pre-existing tests you didn't touch) → fix before proceeding
- Capture: total, passed, failed, skipped

### 3d: Build Check
- Run the project's build command (next build, vite build, cargo build, etc.)
- If build fails → fix before proceeding

### 3e: Acceptance Criteria Verification
- Go through EACH acceptance criterion in the current story
- Verify it is objectively met
- If any criterion is not met → implement what's missing

**If ANY check fails after 3 fix attempts:**
- Add a detailed note to the story's `notes` field explaining the blocker
- Do NOT mark `passes: true`
- Log what you tried in progress.txt
- Exit cleanly for the next iteration to try

## Phase 4: Commit & Update

Only after ALL checks pass:

9. **Stage ALL changes** including test files, config updates, progress updates
10. **Commit:** `feat: [Story ID] - [Story Title]`
11. **Update `prd.json`:** Set `passes: true` for the completed story
12. **Update `progress.txt`:**
    - Add any new Codebase Patterns discovered (at top of file)
    - Append progress entry:
      ```
      ---
      ## [Date/Time] - [Story ID]: [Title]
      - What was implemented
      - Files changed
      - Tests added/modified
      - **Learnings for future iterations:**
        - [Patterns discovered]
        - [Gotchas encountered]
      ---
      ```
13. **Update `AGENTS.md` or `CLAUDE.md`** with any reusable patterns discovered

## Phase 5: Completion Check

14. Check if ALL stories now have `passes: true`
    - **If yes:** Output `<promise>COMPLETE</promise>`
    - **If no:** Exit cleanly. The next iteration will pick up the next story.

## Rules

- **ONE story per iteration.** Never implement multiple stories.
- **NEVER mark `passes: true` with failing checks.** The checkpoint is non-negotiable.
- **NEVER skip tests.** If no test infrastructure exists, bootstrap it as the first action.
- **NEVER output `<promise>COMPLETE</promise>` unless ALL stories pass.** Lying to escape the loop wastes iterations.
- **ALWAYS read progress.txt Codebase Patterns first.** Previous iterations learned things the hard way — don't repeat their mistakes.
- **Commit frequently.** One commit per story minimum. Checkpoint commits are fine for complex stories.
- **If stuck:** Write detailed notes in progress.txt so the next iteration can take a different approach.
