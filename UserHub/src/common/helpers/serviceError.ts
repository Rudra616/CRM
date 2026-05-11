// /**
//  * Logs service-layer failures to the console with a stable prefix for grep/debugging.
//  * Always rethrows so controllers can still map errors to HTTP responses.
//  */

/**
 * Logs service errors in a structured format.
 * 
 * @param serviceFile - Name of the file where the error occurred
 * @param operation - The operation or funtion that failed
 * @param error - The error object string or unknown value
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
