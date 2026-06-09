/**
 * Integration tests for applyBackendErrors (Batch C).
 *
 * Run with:  npx jest lib/__tests__/formErrors.test.ts
 * (requires: npm install --save-dev jest @types/jest ts-jest)
 */

import { applyBackendErrors } from '../formErrors';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSetError() {
  const calls: Array<[string, { type: string; message: string }]> = [];
  const fn = (field: string, opts: { type: string; message: string }) => {
    calls.push([field, opts]);
  };
  return { fn, calls };
}

function makeSetGlobalError() {
  const messages: string[] = [];
  const fn = (msg: string) => messages.push(msg);
  return { fn, messages };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('applyBackendErrors', () => {
  // Run all scenarios concurrently via Promise.all so failures are reported together.
  it('routes all scenarios correctly', async () => {
    await Promise.all([
      // 1. VALIDATION_ERROR with multiple fields → sets each field, no global error
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields: { email: 'must not be blank', password: 'must contain special character' },
          },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(2);
        expect(se.calls).toContainEqual(['email', { type: 'server', message: 'must not be blank' }]);
        expect(se.calls).toContainEqual(['password', { type: 'server', message: 'must contain special character' }]);
        expect(ge.messages).toHaveLength(0);
      })(),

      // 2. VALIDATION_ERROR with a single field → sets that field only
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: { bio: 'too short' } },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(1);
        expect(se.calls[0]).toEqual(['bio', { type: 'server', message: 'too short' }]);
        expect(ge.messages).toHaveLength(0);
      })(),

      // 3. VALIDATION_ERROR with empty fields object → falls back to global error
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: {} },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Validation failed']);
      })(),

      // 4. VALIDATION_ERROR with null fields → falls back to global error
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: null },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Validation failed']);
      })(),

      // 5. EMAIL_EXISTS (non-validation code) → global error, no field errors
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'EMAIL_EXISTS', message: 'This email is already registered.' },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['This email is already registered.']);
      })(),

      // 6. ACCOUNT_LOCKED → global error, no field errors
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked.' },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Account temporarily locked.']);
      })(),

      // 7. INVALID_TOKEN → global error, no field errors
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'INVALID_TOKEN', message: 'Token has expired.' },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Token has expired.']);
      })(),

      // 8. No code (network/unknown error) → global error, no field errors
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { message: 'Network error' },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Network error']);
      })(),

      // 9. INTERNAL_ERROR → global error, no field errors
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
          se.fn as any,
          ge.fn
        );
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Something went wrong.']);
      })(),

      // 10. VALIDATION_ERROR with fields but code check is case-sensitive (wrong case → global)
      (async () => {
        const se = makeSetError();
        const ge = makeSetGlobalError();
        applyBackendErrors(
          { code: 'validation_error', message: 'Validation failed', fields: { name: 'required' } },
          se.fn as any,
          ge.fn
        );
        // 'validation_error' !== 'VALIDATION_ERROR' — must fall back to global
        expect(se.calls).toHaveLength(0);
        expect(ge.messages).toEqual(['Validation failed']);
      })(),
    ]);
  });
});
