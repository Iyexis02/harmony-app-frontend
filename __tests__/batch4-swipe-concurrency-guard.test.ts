/**
 * Batch 4 — Swipe Concurrency Guard
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch4-swipe-concurrency-guard.test.ts
 *
 * Verifies (static analysis of discover/page.tsx source):
 *
 * 1. isSwipingRef is declared.
 * 2. isSwiping state mirrors the ref (for button disabled re-renders).
 * 3. handleSwipe is async.
 * 4. handleSwipe guards on isSwipingRef.current before proceeding.
 * 5. isSwipingRef.current is set to true inside handleSwipe.
 * 6. swipe() is awaited inside handleSwipe.
 * 7. A try/finally block resets both isSwipingRef.current and setIsSwiping(false).
 * 8. Like, Pass, Super Like, and Block buttons are disabled on isSwiping.
 * 9. Undo button is NOT disabled on isSwiping (it uses a different guard).
 * 10. Keyboard handler still checks isSwipingRef.current.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(
  resolve(__dirname, '../app/discover/page.tsx'),
  'utf-8'
);

describe('Batch 4 — Swipe Concurrency Guard', () => {
  it('declares isSwipingRef', () => {
    expect(src).toMatch(/isSwipingRef\s*=\s*useRef\(false\)/);
  });

  it('declares isSwiping state to mirror the ref', () => {
    expect(src).toMatch(/\bisSwiping\b.+\bsetIsSwiping\b.+useState\(false\)/);
  });

  it('handleSwipe is declared as async', () => {
    expect(src).toMatch(/const handleSwipe\s*=\s*async\s*\(/);
  });

  it('handleSwipe guard includes isSwipingRef.current', () => {
    // The guard line must contain all three conditions
    const guardLine = src
      .split('\n')
      .find(line => line.includes('isSwipingRef.current') && line.includes('rateLimited') && line.includes('return'));
    expect(guardLine).toBeTruthy();
  });

  it('sets isSwipingRef.current = true inside handleSwipe', () => {
    expect(src).toMatch(/isSwipingRef\.current\s*=\s*true/);
  });

  it('calls setIsSwiping(true) inside handleSwipe', () => {
    expect(src).toMatch(/setIsSwiping\(true\)/);
  });

  it('awaits the swipe() call', () => {
    expect(src).toMatch(/await\s+swipe\(/);
  });

  it('resets isSwipingRef.current = false in finally block', () => {
    // Verify finally exists and the reset is inside it
    const finallyIndex = src.indexOf('finally');
    expect(finallyIndex).toBeGreaterThan(-1);
    const afterFinally = src.slice(finallyIndex);
    expect(afterFinally).toMatch(/isSwipingRef\.current\s*=\s*false/);
  });

  it('calls setIsSwiping(false) in finally block', () => {
    const finallyIndex = src.indexOf('finally');
    const afterFinally = src.slice(finallyIndex);
    expect(afterFinally).toMatch(/setIsSwiping\(false\)/);
  });

  it('exactly 4 buttons are disabled on isSwiping (Like, Pass, Super Like, Block)', () => {
    // Count occurrences of the combined disabled prop
    const matches = src.match(/disabled=\{rateLimited \|\| isSwiping\}/g);
    expect(matches).toHaveLength(4);
  });

  it('Undo button is NOT disabled on isSwiping', () => {
    // The only disabled={!lastSwipedUserId} guard must exist (undo's own guard)
    expect(src).toMatch(/disabled=\{!lastSwipedUserId\}/);
  });

  it('Undo button disabled prop does not reference isSwiping', () => {
    // Extract the undo button block — between its aria-label and the next aria-label
    const undoStart = src.indexOf('aria-label="Undo last swipe"');
    const undoBlock = src.slice(undoStart - 400, undoStart + 50);
    expect(undoBlock).not.toMatch(/isSwiping/);
  });

  it('keyboard handler still checks isSwipingRef.current', () => {
    // The keyboard guard line should include isSwipingRef.current
    const keyboardGuard = src
      .split('\n')
      .find(line => line.includes('isSwipingRef.current') && line.includes('loading'));
    expect(keyboardGuard).toBeTruthy();
  });

  it('no unguarded direct swipe() call remains (all calls are awaited)', () => {
    // Every non-comment occurrence of swipe( that isn't prefixed with await
    const lines = src.split('\n').filter(l => !l.trim().startsWith('//'));
    const unawaitedSwipeCalls = lines.filter(
      l => /(?<!await\s{0,10})\bswipe\(/.test(l) && !l.includes('undoSwipe') && !l.includes('const swipe')
    );
    expect(unawaitedSwipeCalls).toHaveLength(0);
  });
});
