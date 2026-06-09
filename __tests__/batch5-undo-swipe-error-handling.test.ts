/**
 * Batch 5 — Undo Swipe Error Handling
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch5-undo-swipe-error-handling.test.ts
 *
 * Verifies (static analysis of source files) that:
 *
 * useMatching.ts:
 *  1. undoSwipe captures prevIndex before decrementing.
 *  2. undoSwipe awaits the DELETE request (no void fire-and-forget).
 *  3. undoSwipe checks !result.ok and rolls the index forward on failure.
 *  4. undoSwipe shows "Nothing to undo." for a NOT_FOUND code.
 *  5. undoSwipe shows the "unmatch first" message for a CONFLICT code.
 *  6. undoSwipe shows "Could not undo swipe" for other errors.
 *  7. undoSwipe fires the success toast "Swipe undone ↩" on success.
 *
 * discover/page.tsx:
 *  7. handleUndo guards on isSwipingRef.current (no undo during in-flight swipe).
 *  8. handleUndo does NOT fire an unconditional toast (toast lives in the hook).
 *  9. Keyboard Ctrl+Z handler guards on !isSwipingRef.current.
 * 10. Keyboard Ctrl+Z handler does NOT fire an unconditional toast.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hook = readFileSync(
  resolve(__dirname, '../app/hooks/useMatching.ts'),
  'utf-8'
);

const page = readFileSync(
  resolve(__dirname, '../app/discover/page.tsx'),
  'utf-8'
);

// ---------------------------------------------------------------------------
// Helpers — isolate the undoSwipe callback body for targeted assertions
// ---------------------------------------------------------------------------

/** Extract source between `const undoSwipe` and its closing `}, [` dependency array. */
function extractUndoSwipeBody(src: string): string {
  const start = src.indexOf('const undoSwipe = useCallback(');
  // Match the useCallback closing regardless of which deps are listed, so the
  // helper survives dependency-array changes (e.g. adding lastSwipeResult).
  const end = src.indexOf('}, [', start);
  return src.slice(start, end);
}

/** Extract source between `const handleUndo` and the closing `};`. */
function extractHandleUndoBody(src: string): string {
  const start = src.indexOf('const handleUndo = async');
  const end = src.indexOf('\n  };', start);
  return src.slice(start, end + 5);
}

/** Extract the Ctrl+Z keyboard block. */
function extractCtrlZBlock(src: string): string {
  const marker = "e.key === 'z'";
  const start = src.lastIndexOf('if ((e.ctrlKey', src.indexOf(marker));
  const end = src.indexOf('return;\n      }', start) + 15;
  return src.slice(start, end);
}

const undoBody = extractUndoSwipeBody(hook);
const handleUndoBody = extractHandleUndoBody(page);
const ctrlZBlock = extractCtrlZBlock(page);

// ---------------------------------------------------------------------------
// useMatching.ts — undoSwipe implementation
// ---------------------------------------------------------------------------

describe('Batch 5 — useMatching: undoSwipe', () => {
  it('captures prevIndex from currentMatchIndexRef before decrementing', () => {
    expect(undoBody).toMatch(/prevIndex\s*=\s*currentMatchIndexRef\.current/);
    // prevIndex must appear before the setCurrentMatchIndex decrement
    const prevIndexPos = undoBody.indexOf('prevIndex = currentMatchIndexRef');
    const decrementPos = undoBody.indexOf('setCurrentMatchIndex((prev)');
    expect(prevIndexPos).toBeLessThan(decrementPos);
  });

  it('awaits the DELETE request (no void fire-and-forget)', () => {
    expect(undoBody).toMatch(/const result\s*=\s*await\s+authenticatedApiRequest/);
    expect(undoBody).not.toMatch(/void\s+authenticatedApiRequest/);
  });

  it('checks !result.ok after awaiting', () => {
    expect(undoBody).toMatch(/if\s*\(\s*!result\.ok\s*\)/);
  });

  it('rolls the index forward with setCurrentMatchIndex(prevIndex) on failure', () => {
    // Ensure the roll-forward call is inside the !result.ok branch
    const errorBranchStart = undoBody.indexOf('if (!result.ok)');
    const rollForward = undoBody.indexOf('setCurrentMatchIndex(prevIndex)', errorBranchStart);
    expect(rollForward).toBeGreaterThan(errorBranchStart);
  });

  it('shows "Nothing to undo." for a NOT_FOUND code (re-messaged from the old 404 copy)', () => {
    expect(undoBody).toMatch(/code\s*===\s*ErrorCode\.NOT_FOUND/);
    expect(undoBody).toMatch(/Nothing to undo\./);
    // The endpoint is live now — the old "not available yet" copy must be gone.
    expect(undoBody).not.toMatch(/not available yet/);
  });

  it('shows the "unmatch first" message for a CONFLICT code (swipe became a match)', () => {
    expect(undoBody).toMatch(/code\s*===\s*ErrorCode\.CONFLICT/);
    expect(undoBody).toMatch(/unmatch first to undo/);
  });

  it('shows "Could not undo swipe" for other errors', () => {
    expect(undoBody).toMatch(/Could not undo swipe/);
  });

  it('fires the success toast "Swipe undone ↩" only when result.ok', () => {
    // The success toast must appear AFTER the !result.ok block (i.e., after the return)
    const errorBlockEnd = undoBody.indexOf('return;\n    }');
    const successToast = undoBody.indexOf("toast('Swipe undone ↩')", errorBlockEnd);
    expect(successToast).toBeGreaterThan(errorBlockEnd);
  });

  it('does not call toast directly inside the !result.ok === false (success) path before error branch', () => {
    // There should be exactly ONE "Swipe undone ↩" in the whole hook body, placed after the error block
    const occurrences = (undoBody.match(/Swipe undone/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// discover/page.tsx — handleUndo
// ---------------------------------------------------------------------------

describe('Batch 5 — discover/page.tsx: handleUndo', () => {
  it('guards on isSwipingRef.current so undo cannot fire mid-swipe', () => {
    expect(handleUndoBody).toMatch(/isSwipingRef\.current/);
  });

  it('early-returns when isSwipingRef.current is truthy', () => {
    // The guard condition must include isSwipingRef.current and a return on the same line/block
    expect(handleUndoBody).toMatch(/isSwipingRef\.current.*return|return.*isSwipingRef\.current/s);
  });

  it('does NOT fire an unconditional toast("Swipe undone ↩") — toast moved to hook', () => {
    expect(handleUndoBody).not.toMatch(/toast\s*\(\s*['"]Swipe undone/);
  });
});

// ---------------------------------------------------------------------------
// discover/page.tsx — keyboard Ctrl+Z handler
// ---------------------------------------------------------------------------

describe('Batch 5 — discover/page.tsx: keyboard Ctrl+Z handler', () => {
  it('guards on !isSwipingRef.current before calling undoSwipeRef', () => {
    expect(ctrlZBlock).toMatch(/!isSwipingRef\.current/);
  });

  it('does NOT fire an unconditional toast("Swipe undone ↩") — toast moved to hook', () => {
    expect(ctrlZBlock).not.toMatch(/toast\s*\(\s*['"]Swipe undone/);
  });

  it('still calls undoSwipeRef.current() when conditions are met', () => {
    expect(ctrlZBlock).toMatch(/undoSwipeRef\.current\(\)/);
  });
});
