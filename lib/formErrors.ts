import { UseFormSetError } from 'react-hook-form';
import { ErrorCode } from '@/types/error';

/**
 * Maps backend field-level validation errors to React Hook Form field errors.
 * Falls back to a global error message for non-validation errors.
 */
export function applyBackendErrors(
  error: { code?: string; message: string; fields?: Record<string, string> | null },
  setError: UseFormSetError<any>,
  setGlobalError: (msg: string) => void
): void {
  if (error.code === ErrorCode.VALIDATION_ERROR && error.fields) {
    let fieldSet = false;
    for (const [field, message] of Object.entries(error.fields)) {
      setError(field, { type: 'server', message });
      fieldSet = true;
    }
    if (!fieldSet) {
      setGlobalError(error.message);
    }
  } else {
    setGlobalError(error.message);
  }
}
