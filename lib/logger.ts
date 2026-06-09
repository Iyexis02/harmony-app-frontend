export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  console.error({
    context,
    error: error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}
