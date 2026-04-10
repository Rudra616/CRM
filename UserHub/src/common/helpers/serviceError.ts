/**
 * Logs service-layer failures to the console with a stable prefix for grep/debugging.
 * Always rethrows so controllers can still map errors to HTTP responses.
 */
export const logServiceError = (
  serviceFile: string,
  operation: string,
  error: unknown
): void => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  console.error(`[${serviceFile}] ${operation} failed:`, message);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
};
